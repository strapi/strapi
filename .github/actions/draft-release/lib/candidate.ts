import { extractJsonBlock } from './report.ts';
import { compareStable, parseStable } from './semver.ts';

import type { Candidate, PullPayload, ReleaseMode } from './types.ts';

/**
 * Finding the release candidate that is already in flight.
 *
 * The action runs more than once per release: `develop` keeps moving while a candidate is open, and
 * a later run has to fold what landed since into the same release rather than start a new one. The
 * open pull request is what identifies it.
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
export function parseReleaseBranch(headRef: string): string | null {
  return RELEASE_BRANCH_PATTERN.exec(headRef ?? '')?.[1] ?? null;
}

/**
 * Finds the candidate among the pull requests open against the release base.
 *
 * @returns `null` when none is open, which is a fresh draft.
 * @throws When more than one is open. Two candidates mean a human is mid-intervention, and picking
 * one of them would finish the intervention on their behalf.
 */
export function findCandidate(pulls: readonly PullPayload[]): Candidate | null {
  const candidates = pulls.flatMap((pull) => {
    const version = parseReleaseBranch(pull.head?.ref ?? '');

    return version === null
      ? []
      : [
          {
            version,
            branch: pull.head?.ref ?? '',
            pullNumber: pull.number,
            pullUrl: pull.html_url ?? '',
            pullHeadSha: pull.head?.sha ?? '',
            payload: extractJsonBlock(pull.body ?? ''),
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
  const version = parseStable(candidate.version);
  const baseline = parseStable(baselineVersion);

  if (version === null || baseline === null) {
    throw new Error(
      `Cannot compare the candidate ${candidate.version} with the published baseline ` +
        `${baselineVersion}. Both have to be plain x.y.z versions.`
    );
  }

  if (compareStable(version, baseline) !== 1) {
    throw new Error(
      `The candidate ${candidate.version} on #${candidate.pullNumber} is not above the published ` +
        `baseline ${baselineVersion}, so that release already shipped. Close the pull request ` +
        'before drafting the next one.'
    );
  }
}

/**
 * Refuses a release branch that carries work of its own.
 *
 * A candidate branch is only ever a pointer into `develop`. When its head is not contained in
 * `develop`, somebody pushed to it: a cherry-pick, or the version-bump commit `publish.sh` makes
 * at publish time. Advancing it to `develop`'s head would throw that commit away, and the ruleset
 * would refuse the non-fast-forward push in any case.
 */
export function assertBranchContained(input: {
  branch: string;
  branchHeadSha: string;
  sourceRef: string;
  sourceSha: string;
  contained: boolean;
}): void {
  if (input.contained === true) {
    return;
  }

  throw new Error(
    `${input.branch} (${input.branchHeadSha}) is not contained in ${input.sourceRef} ` +
      `(${input.sourceSha}). Something was pushed to the release branch directly, so this run ` +
      'would discard it. Resolve the branch by hand.'
  );
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
  const current = parseStable(candidate.version);

  if (recomputed === null || current === null) {
    throw new Error(
      `Cannot compare ${version} with the candidate ${candidate.version}. ` +
        'Both have to be plain x.y.z versions.'
    );
  }

  const order = compareStable(recomputed, current);

  if (order === -1) {
    throw new Error(
      `The range now computes ${version}, below the candidate ${candidate.version} on ` +
        `#${candidate.pullNumber}. The release range only ever grows, so this means ${candidate.branch} ` +
        'was cut from a history that no longer exists. Resolve it by hand.'
    );
  }

  return order === 0 ? 'refresh' : 'redraft';
}

function readString(source: unknown, path: readonly string[]): string | null {
  const value = path.reduce<unknown>(
    (node, key) =>
      typeof node === 'object' && node !== null
        ? (node as Record<string, unknown>)[key]
        : undefined,
    source
  );

  return typeof value === 'string' ? value : null;
}

/**
 * Compares the candidate's own payload with the branch it lives on.
 *
 * The branch name is the authority, because it is what the release is published from. A payload
 * that disagrees means the body was hand-edited, which is worth saying out loud and not worth
 * stopping for.
 *
 * @returns One warning per disagreement, empty when the payload is absent or consistent.
 */
export function crossCheckCandidate(candidate: Candidate): string[] {
  if (candidate.payload === null) {
    return [
      `#${candidate.pullNumber} carries no readable release candidate block, so its branch name ` +
        'is the only evidence of the version it was cut under.',
    ];
  }

  const recordedBranch = readString(candidate.payload, ['candidate', 'branch']);
  const recordedVersion = readString(candidate.payload, ['release', 'version']);

  return [
    recordedBranch === null || recordedBranch === candidate.branch
      ? null
      : `#${candidate.pullNumber} lives on \`${candidate.branch}\` but its payload records ` +
        `\`${recordedBranch}\`.`,
    recordedVersion === null || recordedVersion === candidate.version
      ? null
      : `#${candidate.pullNumber} was cut as \`${candidate.version}\` but its payload records ` +
        `\`${recordedVersion}\`.`,
  ].filter((warning): warning is string => warning !== null);
}
