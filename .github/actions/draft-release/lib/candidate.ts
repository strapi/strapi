import { compareStable, formatStable, parseStable } from './semver.ts';

import type {
  Candidate,
  GitAdapter,
  PinnedRange,
  PullPayload,
  ReleaseMode,
  RepositoryCoords,
  StableVersion,
} from './types.ts';

/**
 * Finding the release candidate that is already in flight.
 *
 * The action runs more than once per release: `develop` keeps moving while a candidate is open, and
 * a later run has to fold what landed since into the same release rather than start a new one. The
 * open pull request is what identifies it, and only one whose head lives in this repository counts.
 * Anyone can open a pull request from a fork with a branch named `releases/x.y.z`, and a candidate
 * is something only this repository's own automation can have cut.
 *
 * Nothing else is a usable key. A release branch outlives its candidate, because the ruleset over
 * `releases/*` forbids deletion without a bypass, so a leftover branch says nothing about what is
 * in flight. A milestone is renamed by this very action. The pull request is the one artifact whose
 * lifecycle is the candidate's own.
 */

const RELEASE_BRANCH_PATTERN = /^releases\/(\d+\.\d+\.\d+)$/u;

/**
 * The version a release branch name carries.
 *
 * @returns `null` for any branch that is not exactly `releases/x.y.z`, so a branch such as
 * `releases/5.53.0-hotfix` is not mistaken for a candidate.
 */
export function parseReleaseBranch(headRef: string): StableVersion | null {
  return parseStable(RELEASE_BRANCH_PATTERN.exec(headRef)?.[1]);
}

/**
 * Finds the candidate among the pull requests open against the release base.
 *
 * A pull request whose head is not in this repository is skipped, not refused: a fork can name its
 * branch anything, and stopping on it would let anyone block a release by opening one.
 *
 * @returns `null` when none is open, which is a fresh draft.
 * @throws When more than one is open. Two candidates mean a human is mid-intervention, and picking
 * one of them would finish the intervention on their behalf.
 */
export function findCandidate(
  pulls: readonly PullPayload[],
  coords: RepositoryCoords
): Candidate | null {
  const ownRepository = `${coords.owner}/${coords.repo}`;

  const candidates = pulls.flatMap((pull) => {
    if (pull.head?.repo?.full_name !== ownRepository) {
      return [];
    }

    const branch = pull.head.ref ?? '';
    const parsedVersion = parseReleaseBranch(branch);

    return parsedVersion === null
      ? []
      : [
          {
            version: formatStable(parsedVersion),
            parsedVersion,
            branch,
            pullNumber: pull.number,
            pullUrl: pull.html_url ?? '',
          },
        ];
  });

  if (candidates.length > 1) {
    const listed = candidates.map((entry) => `#${entry.pullNumber} (${entry.branch})`).join(', ');

    throw new Error(
      `Found ${candidates.length} open release pull requests: ${listed}. ` +
        'Close the ones that are not the candidate before drafting a release.'
    );
  }

  return candidates[0] ?? null;
}

/**
 * Refuses a candidate whose release already went out.
 *
 * npm is the authority on what shipped. A candidate at or below the published baseline means the
 * release completed and its pull request was left open, and folding new work into it would rewrite
 * a branch that `publish.sh` has already tagged.
 */
export function assertCandidateUnpublished(candidate: Candidate, baselineVersion: string): void {
  const baseline = parseStable(baselineVersion);

  if (baseline === null) {
    throw new Error(
      `Cannot compare the candidate ${candidate.version} with the published baseline ` +
        `${baselineVersion}, which is not a plain x.y.z version.`
    );
  }

  if (compareStable(candidate.parsedVersion, baseline) !== 1) {
    throw new Error(
      `The candidate ${candidate.version} on #${candidate.pullNumber} is not above the published ` +
        `baseline ${baselineVersion}, so that release already shipped. Close the pull request ` +
        'before drafting the next one.'
    );
  }
}

/**
 * Decides what this run does with the candidate.
 *
 * @throws When the recomputed version is below the candidate's. The range only ever grows between
 * runs, and a revert lands as a `revert` commit rather than removing the `feat` it undoes, so a
 * lower version means an assumption this action rests on is broken. Renaming a milestone backwards
 * is not a guess worth making.
 */
export function decideMode(candidate: Candidate | null, version: string): ReleaseMode {
  if (candidate === null) {
    return 'draft';
  }

  const recomputed = parseStable(version);

  if (recomputed === null) {
    throw new Error(
      `Cannot compare ${version} with the candidate ${candidate.version}. ` +
        'The recomputed version has to be a plain x.y.z version.'
    );
  }

  const order = compareStable(recomputed, candidate.parsedVersion);

  if (order === -1) {
    throw new Error(
      `The range now computes ${version}, below the candidate ${candidate.version} on ` +
        `#${candidate.pullNumber}. The release range only ever grows, so this means ${candidate.branch} ` +
        'was cut from a history that no longer exists. Resolve it by hand.'
    );
  }

  return order === 0 ? 'refresh' : 'redraft';
}

/**
 * Decides what has to happen to the release branch, and refuses what must not.
 *
 * @returns `advances: false` when the branch already points at the pinned head, which is the case
 * where nothing landed since the last run. Pushing anyway would fire `synchronize` on the pull
 * request and publish another identical experimental artifact for nothing. `candidateHeadSha` is
 * the head git resolved for the candidate's branch, `null` without a candidate; a redraft deletes
 * that branch under a lease on exactly this value.
 * @throws When the candidate's branch carries work of its own. A candidate branch is only ever a
 * pointer into `develop`, so a head not contained in it means somebody pushed to it: a cherry-pick,
 * or the version-bump commit `publish.sh` makes at publish time. Advancing or deleting it would
 * throw that commit away, and the ruleset would refuse the non-fast-forward push in any case.
 */
export function planBranch(input: {
  git: GitAdapter;
  mode: ReleaseMode;
  branch: string;
  candidate: Candidate | null;
  range: PinnedRange;
}): { advances: boolean; candidateHeadSha: string | null } {
  const { git, mode, branch, candidate, range } = input;

  if (mode !== 'refresh' && git.remoteBranchExists(branch) === true) {
    throw new Error(
      `The branch ${branch} already exists but no open pull request is drafting it. ` +
        'An earlier run left it behind. Delete it, or reopen its pull request, before drafting.'
    );
  }

  if (candidate === null) {
    return { advances: true, candidateHeadSha: null };
  }

  if (git.remoteBranchExists(candidate.branch) === false) {
    throw new Error(
      `#${candidate.pullNumber} is open against ${candidate.branch}, but that branch is gone from ` +
        'the remote. Close the pull request, or restore the branch, before drafting.'
    );
  }

  git.fetchBranch(candidate.branch);

  const candidateHeadSha = git.resolveSha(`origin/${candidate.branch}`);

  if (git.isAncestor(candidateHeadSha, range.toSha) === false) {
    throw new Error(
      `${candidate.branch} (${candidateHeadSha}) is not contained in ${range.toRef} ` +
        `(${range.toSha}). Something was pushed to the release branch directly, so this run ` +
        'would discard it. Resolve the branch by hand.'
    );
  }

  return { advances: mode === 'redraft' || candidateHeadSha !== range.toSha, candidateHeadSha };
}
