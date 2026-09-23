import { execFileSync } from 'node:child_process';

import { mutationFailure } from './journal.ts';

import type { ExecResult, GitAdapter, GitExec, Integration, PinnedRange } from './types.ts';

export const RECORD_SEPARATOR = '\x1e';
export const FIELD_SEPARATOR = '\x1f';

/** `%x1f` and `%x1e` make git emit the separators, so no control byte is embedded in this source. */
export const LOG_FORMAT = ['%H', '%P', '%an', '%ae', '%aI', '%s', '%b'].join('%x1f') + '%x1e';

const BODY_FIELD_INDEX = 6;

/**
 * Parses the first-parent log into integration records.
 *
 * The body is the last field on purpose: it is the only field that can contain newlines, so
 * everything before it stays unambiguous.
 */
export function parseFirstParentLog(stdout: string): Integration[] {
  return stdout
    .split(RECORD_SEPARATOR)
    .map((chunk) => chunk.replace(/^[\r\n]+/u, ''))
    .filter((chunk) => chunk.trim() !== '')
    .map((chunk) => {
      const fields = chunk.split(FIELD_SEPARATOR);

      return {
        sha: fields[0] ?? '',
        parents: (fields[1] ?? '').split(' ').filter((parent) => parent !== ''),
        author: fields[2] ?? '',
        email: fields[3] ?? '',
        authoredAt: fields[4] ?? '',
        subject: fields[5] ?? '',
        body: fields.slice(BODY_FIELD_INDEX).join(FIELD_SEPARATOR).trim(),
      };
    });
}

/**
 * Builds the real process surface.
 *
 * It reports a failure rather than throwing, so each adapter method decides for itself what a
 * non-zero exit means.
 */
// Coverage skip: thin `execFileSync` passthrough. Every consumer is tested against a stub GitExec.
/* node:coverage disable */
export function createGitExec(cwd: string = process.cwd()): GitExec {
  return (args) => {
    try {
      const stdout = execFileSync('git', args, {
        cwd,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      });

      return { status: 0, stdout, stderr: '' };
    } catch (error) {
      const failure = error as {
        status?: number;
        stdout?: string;
        stderr?: string;
        message?: string;
      };

      return {
        status: typeof failure.status === 'number' ? failure.status : 1,
        stdout: failure.stdout ?? '',
        stderr: failure.stderr ?? String(failure.message ?? error),
      };
    }
  };
}
/* node:coverage enable */

/** Wraps a process surface into the Git operations this action performs. */
export function createGitAdapter(exec: GitExec): GitAdapter {
  const commandError = (args: readonly string[], result: ExecResult): string =>
    `git ${args.join(' ')} failed: ${result.stderr.trim()}`;

  function run(args: string[]): string {
    const result = exec(args);

    if (result.status !== 0) {
      throw new Error(commandError(args, result));
    }

    return result.stdout;
  }

  type RemoteHead =
    | { state: 'found'; sha: string }
    | { state: 'missing' }
    | { state: 'unknown'; error: string };

  /**
   * Reads one exact branch ref after a push fails, so the journal records the observed remote state
   * instead of treating a local exit code as proof.
   */
  function readRemoteHead(branch: string): RemoteHead {
    const ref = `refs/heads/${branch}`;
    const args = ['ls-remote', '--exit-code', '--heads', 'origin', ref];
    const result = exec(args);

    if (result.status === 2) {
      return { state: 'missing' };
    }

    if (result.status !== 0) {
      return { state: 'unknown', error: commandError(args, result) };
    }

    const match = result.stdout
      .trim()
      .split(/\r?\n/u)
      .map((line) => line.split(/\s+/u))
      .find((fields) => fields[1] === ref);

    return match?.[0] === undefined
      ? { state: 'unknown', error: `git ls-remote returned no exact value for ${ref}` }
      : { state: 'found', sha: match[0] };
  }

  function push(
    args: string[],
    branch: string,
    desiredSha: string | null,
    previousSha: string | null
  ): void {
    const result = exec(args);

    if (result.status === 0) {
      return;
    }

    const message = commandError(args, result);
    const remote = readRemoteHead(branch);

    if (remote.state === 'unknown') {
      throw mutationFailure(`${message}. Remote verification failed: ${remote.error}`, 'unknown');
    }

    const desiredStateObserved =
      desiredSha === null
        ? remote.state === 'missing'
        : remote.state === 'found' && remote.sha === desiredSha;

    if (desiredStateObserved === true) {
      return;
    }

    const previousStateObserved =
      previousSha === null
        ? remote.state === 'missing'
        : remote.state === 'found' && remote.sha === previousSha;

    if (previousStateObserved === true) {
      throw mutationFailure(message, 'refused');
    }

    const observed = remote.state === 'missing' ? 'missing' : remote.sha;

    throw mutationFailure(
      `${message}. Remote verification found unexpected state ${observed}.`,
      'unknown'
    );
  }

  return {
    resolveSha(ref) {
      return run(['rev-parse', '--verify', `${ref}^{commit}`]).trim();
    },

    refExists(ref) {
      return exec(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]).status === 0;
    },

    isAncestor(ancestor, descendant) {
      return exec(['merge-base', '--is-ancestor', ancestor, descendant]).status === 0;
    },

    /**
     * Enumerates one record per integration, oldest first.
     *
     * First-parent traversal turns a merged pull request into a single record instead of every
     * commit on its side branch. Walking locally also avoids the 250-commit truncation of the
     * GitHub compare endpoint.
     */
    listIntegrations(fromSha, toSha) {
      return parseFirstParentLog(
        run([
          'log',
          '--first-parent',
          '--reverse',
          `--format=${LOG_FORMAT}`,
          `${fromSha}..${toSha}`,
        ])
      );
    },

    pushBranch(sha, branch, expectedSha) {
      push(['push', 'origin', `${sha}:refs/heads/${branch}`], branch, sha, expectedSha);
    },

    /**
     * Compare-and-swap, not a plain delete. The lease names the head the preflight resolved, so a
     * commit pushed to the branch between preflight and this write makes git refuse rather than
     * drop it.
     */
    deleteBranch(branch, expectedSha) {
      push(
        [
          'push',
          `--force-with-lease=refs/heads/${branch}:${expectedSha}`,
          'origin',
          `:refs/heads/${branch}`,
        ],
        branch,
        null,
        expectedSha
      );
    },

    /**
     * Brings one remote branch into `refs/remotes/origin`.
     *
     * Forced on purpose: the local remote-tracking ref is a read cache with no history to protect,
     * and a release branch that was rewritten would otherwise refuse to update.
     */
    fetchBranch(branch) {
      run(['fetch', '--force', 'origin', `refs/heads/${branch}:refs/remotes/origin/${branch}`]);
    },

    remoteBranchExists(branch) {
      const remote = readRemoteHead(branch);

      if (remote.state === 'unknown') {
        throw new Error(remote.error);
      }

      return remote.state === 'found';
    },
  };
}

/**
 * Pins the release range once, so every later step reads SHAs instead of moving branch names.
 *
 * A pull request merged into the source branch while the action runs falls outside this range, and
 * therefore outside the release, however long the run takes.
 */
export function pinRange(
  git: GitAdapter,
  options: { baselineVersion: string; sourceRef: string }
): PinnedRange {
  const fromRef = `v${options.baselineVersion}`;

  if (git.refExists(fromRef) === false) {
    throw new Error(
      `The baseline tag ${fromRef} is missing. Check out with fetch-depth: 0 so tags are available.`
    );
  }

  const fromSha = git.resolveSha(fromRef);
  const toRef = `origin/${options.sourceRef}`;

  if (git.refExists(toRef) === false) {
    throw new Error(`The source ref ${toRef} does not exist.`);
  }

  const toSha = git.resolveSha(toRef);

  if (git.isAncestor(fromSha, toSha) === false) {
    throw new Error(
      `${fromRef} (${fromSha}) is not an ancestor of ${toRef} (${toSha}). ` +
        'The range is not a fast-forward.'
    );
  }

  return { fromRef, fromSha, toRef, toSha };
}
