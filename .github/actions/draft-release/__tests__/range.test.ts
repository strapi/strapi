import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  FIELD_SEPARATOR,
  RECORD_SEPARATOR,
  createGitAdapter,
  parseFirstParentLog,
  pinRange,
} from '../lib/range.ts';

import type { ExecResult, GitAdapter, GitExec } from '../lib/types.ts';

function log(records: readonly (readonly string[])[]): string {
  return records.map((fields) => fields.join(FIELD_SEPARATOR) + RECORD_SEPARATOR).join('\n');
}

describe('parseFirstParentLog', () => {
  it('reads one record per integration', () => {
    const stdout = log([
      [
        'abc',
        'def',
        'Alice',
        'alice@example.com',
        '2026-09-05T10:00:00Z',
        'fix(upload): a thing (#1)',
        '',
      ],
      [
        'fed',
        'cba 999',
        'Bob',
        'bob@example.com',
        '2026-09-05T11:00:00Z',
        'Merge pull request #2 from strapi/x',
        '',
      ],
    ]);

    assert.deepEqual(parseFirstParentLog(stdout), [
      {
        sha: 'abc',
        parents: ['def'],
        author: 'Alice',
        email: 'alice@example.com',
        authoredAt: '2026-09-05T10:00:00Z',
        subject: 'fix(upload): a thing (#1)',
        body: '',
      },
      {
        sha: 'fed',
        parents: ['cba', '999'],
        author: 'Bob',
        email: 'bob@example.com',
        authoredAt: '2026-09-05T11:00:00Z',
        subject: 'Merge pull request #2 from strapi/x',
        body: '',
      },
    ]);
  });

  it('keeps a multi-line body intact', () => {
    const stdout = log([
      [
        'abc',
        'def',
        'Alice',
        'alice@example.com',
        '2026-09-05T10:00:00Z',
        'feat!: drop node 20',
        'BREAKING CHANGE: gone\n\nmore',
      ],
    ]);

    assert.equal(parseFirstParentLog(stdout)[0]?.body, 'BREAKING CHANGE: gone\n\nmore');
  });

  it('returns nothing for an empty range', () => {
    assert.deepEqual(parseFirstParentLog(''), []);
  });
});

describe('createGitAdapter', () => {
  function execStub(responses: Record<string, ExecResult>): GitExec {
    return (args) => {
      const command = args.join(' ');
      const key = Object.keys(responses).find((prefix) => command.startsWith(prefix));

      return responses[key ?? ''] ?? { status: 1, stdout: '', stderr: 'unexpected' };
    };
  }

  it('reports a non-zero exit as a boolean, not an exception', () => {
    const exec = execStub({ 'merge-base': { status: 1, stdout: '', stderr: '' } });

    assert.equal(createGitAdapter(exec).isAncestor('a', 'b'), false);
  });

  it('turns a failed command into an error naming the command', () => {
    const exec = execStub({ 'rev-parse': { status: 128, stdout: '', stderr: 'bad revision' } });

    assert.throws(
      () => createGitAdapter(exec).resolveSha('nope'),
      /git rev-parse .* bad revision/u
    );
  });

  it('deletes a remote branch under a lease on the head it expects', () => {
    const seen: string[][] = [];
    const exec: GitExec = (args) => {
      seen.push(args);

      return { status: 0, stdout: '', stderr: '' };
    };

    createGitAdapter(exec).deleteBranch('releases/5.52.4', 'face0000');

    assert.deepEqual(seen, [
      [
        'push',
        '--force-with-lease=refs/heads/releases/5.52.4:face0000',
        'origin',
        ':refs/heads/releases/5.52.4',
      ],
    ]);
  });

  it('forces the remote-tracking ref when fetching a branch, since it is only a read cache', () => {
    const seen: string[] = [];
    const exec: GitExec = (args) => {
      seen.push(args.join(' '));

      return { status: 0, stdout: '', stderr: '' };
    };

    createGitAdapter(exec).fetchBranch('releases/5.53.0');

    assert.equal(
      seen[0],
      'fetch --force origin refs/heads/releases/5.53.0:refs/remotes/origin/releases/5.53.0'
    );
  });

  it('carries the exit code on the error, because git updates a ref atomically', () => {
    const exec = execStub({ push: { status: 1, stdout: '', stderr: 'GH013 rule violations' } });

    assert.throws(
      () => createGitAdapter(exec).pushBranch('abc', 'releases/5.53.0'),
      (error: unknown) => (error as { status?: unknown }).status === 1
    );
  });

  it('reports a missing remote branch when ls-remote finds nothing', () => {
    const exec = execStub({ 'ls-remote': { status: 2, stdout: '', stderr: '' } });

    assert.equal(createGitAdapter(exec).remoteBranchExists('releases/5.53.0'), false);
  });

  it('trims the resolved SHA', () => {
    const exec = execStub({ 'rev-parse': { status: 0, stdout: 'abc123\n', stderr: '' } });

    assert.equal(createGitAdapter(exec).resolveSha('develop'), 'abc123');
  });

  it('walks first-parent only, oldest first', () => {
    const seen: string[] = [];
    const exec: GitExec = (args) => {
      seen.push(args.join(' '));

      return { status: 0, stdout: '', stderr: '' };
    };

    createGitAdapter(exec).listIntegrations('from', 'to');

    assert.equal(seen[0]?.includes('--first-parent'), true);
    assert.equal(seen[0]?.includes('--reverse'), true);
    assert.equal(seen[0]?.endsWith('from..to'), true);
  });
});

describe('pinRange', () => {
  function gitStub(overrides: Partial<GitAdapter> = {}): GitAdapter {
    return {
      refExists: () => true,
      resolveSha: (ref) => `sha-of-${ref}`,
      isAncestor: () => true,
      listIntegrations: () => [],
      pushBranch() {},
      deleteBranch() {},
      fetchBranch() {},
      remoteBranchExists: () => false,
      ...overrides,
    };
  }

  it('resolves both ends once and returns the pinned pair', () => {
    assert.deepEqual(pinRange(gitStub(), { baselineVersion: '5.52.3', sourceRef: 'develop' }), {
      fromRef: 'v5.52.3',
      fromSha: 'sha-of-v5.52.3',
      toRef: 'origin/develop',
      toSha: 'sha-of-origin/develop',
    });
  });

  it('stops when the baseline tag is missing', () => {
    const git = gitStub({ refExists: (ref) => ref !== 'v5.52.3' });

    assert.throws(
      () => pinRange(git, { baselineVersion: '5.52.3', sourceRef: 'develop' }),
      /baseline tag v5\.52\.3 is missing/u
    );
  });

  it('stops when the source ref does not exist', () => {
    const git = gitStub({ refExists: (ref) => ref !== 'origin/develop' });

    assert.throws(
      () => pinRange(git, { baselineVersion: '5.52.3', sourceRef: 'develop' }),
      /source ref origin\/develop does not exist/u
    );
  });

  it('stops when the baseline is not an ancestor of the source ref', () => {
    const git = gitStub({ isAncestor: () => false });

    assert.throws(
      () => pinRange(git, { baselineVersion: '5.52.3', sourceRef: 'develop' }),
      /is not an ancestor of/u
    );
  });
});
