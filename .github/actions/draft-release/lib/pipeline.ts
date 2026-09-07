import {
  assertSupportedMergeMethods,
  dedupePullRequests,
  resolveIntegrations,
} from './attribution.ts';
import { classifyIntegrations, decideBump } from './bump.ts';
import {
  assertBranchContained,
  assertCandidateUnpublished,
  crossCheckCandidate,
  decideMode,
  findCandidate,
} from './candidate.ts';
import { planCleanup, planMilestones, planRealignment, reconcile } from './milestones.ts';
import { fetchPackument, resolveLatestVersion } from './npm.ts';
import { pinRange } from './range.ts';
import { buildPayload, renderBody, renderMilestoneComment, renderStepSummary } from './report.ts';
import { compareStable, increment, parseStable } from './semver.ts';

import type { RegistryRequest } from './npm.ts';
import type {
  AttentionRecord,
  AttributedPull,
  AttributionRecord,
  AttributionStatus,
  BumpClassification,
  BumpKind,
  Candidate,
  CleanupItem,
  Clock,
  DraftReleaseInputs,
  GitAdapter,
  GithubAdapter,
  Integration,
  Journal,
  JournalSnapshot,
  Logger,
  MilestonePlan,
  PinnedRange,
  RealignItem,
  ReleaseMode,
  ReleasePayload,
  VersionSource,
} from './types.ts';

/**
 * The branch every release is cut from.
 *
 * Not an input. A release candidate always comes from the protected `develop` head, so nothing
 * about the release content can be chosen at dispatch time.
 */
export const TARGET_BASE = 'develop';
export const RELEASE_BASE = 'main';
export const RELEASE_BRANCH_NAME = 'releases';
export const EXPERIMENTAL_LABEL = 'publish-experimental';

/** Statuses that do not stop the run but do need a human to look. */
const ATTENTION_STATUSES: ReadonlySet<AttributionStatus> = new Set([
  'ambiguous',
  'unresolved',
  'direct-integration',
]);

export type DraftReleaseDeps = {
  inputs: DraftReleaseInputs;
  git: GitAdapter;
  gh: GithubAdapter;
  journal: Journal;
  request: RegistryRequest;
  logger: Logger;
  clock?: Clock;
};

/**
 * Everything the run decided, before it wrote anything.
 *
 * Producing this is the only phase allowed to refuse. Once a plan exists, every remaining step is a
 * write, so a refusal can never leave the repository half-changed.
 */
export type ReleasePlan = {
  mode: ReleaseMode;
  candidate: Candidate | null;
  previousVersion: string;
  version: string;
  bumpKind: BumpKind;
  classification: BumpClassification;
  versionSource: VersionSource;
  range: PinnedRange;
  integrationCount: number;
  pullRequests: AttributedPull[];
  attention: AttentionRecord[];
  warnings: string[];
  milestones: MilestonePlan;
  branch: string;
  /** `false` when the branch already points at the pinned head, so nothing has to be pushed. */
  branchAdvances: boolean;
  realignment: RealignItem[];
};

export type DraftReleaseResult = {
  branch: string;
  bump: BumpKind;
  cleanup: CleanupItem[];
  journal: JournalSnapshot;
  mode: ReleaseMode;
  payload: ReleasePayload;
  pullNumber: number | null;
  pullUrl: string | null;
  summary: string;
  version: string;
  warnings: string[];
};

/**
 * Reads the world and decides the release.
 *
 * The range is pinned before anything else, so a pull request merged while the action runs falls
 * outside the release however long the run takes.
 */
export async function preflightRelease(deps: DraftReleaseDeps): Promise<ReleasePlan> {
  const { inputs, git, gh, request, logger } = deps;

  assertSupportedMergeMethods(await gh.getRepository());

  const previousVersion = resolveLatestVersion(await fetchPackument(request));
  logger.info(`Published baseline: ${previousVersion}`);

  const range = pinRange(git, { baselineVersion: previousVersion, sourceRef: TARGET_BASE });
  logger.info(`Range pinned: ${range.fromRef} (${range.fromSha}) → ${range.toSha}`);

  const integrations = git.listIntegrations(range.fromSha, range.toSha);

  if (integrations.length === 0) {
    throw new Error(`Nothing to release: ${range.fromRef} and ${range.toRef} are the same commit.`);
  }

  logger.info(`${integrations.length} integrations to attribute`);

  const records = await resolveIntegrations(
    integrations,
    { listPullsForCommit: gh.listPullsForCommit, getPull: gh.getPull },
    TARGET_BASE
  );

  assertNoFailedLookups(records);

  const { version, bumpKind, classification, versionSource } = await resolveVersion({
    inputs,
    previousVersion,
    integrations,
    records,
    listPullCommits: gh.listPullCommits,
  });

  logger.info(`Release version: ${version} (${bumpKind}, ${versionSource})`);

  // An integration that carries no product change of its own is not part of the shipping set
  // either. Listing a release back-merge as a shipping pull request would also report it as
  // milestone drift, because it never belonged to the milestone.
  const ignoredShas = new Set(classification.ignored.map((entry) => entry.sha));
  const pullRequests = dedupePullRequests(
    records.filter((record) => ignoredShas.has(record.sha) === false)
  );

  const candidate = findCandidate(await gh.listPulls({ state: 'open', base: RELEASE_BASE }));

  if (candidate !== null) {
    assertCandidateUnpublished(candidate, previousVersion);
  }

  const mode = decideMode(candidate, version);
  const branch = `${RELEASE_BRANCH_NAME}/${version}`;

  logger.info(
    candidate === null
      ? `No candidate in flight: ${mode}`
      : `Candidate ${candidate.version} on #${candidate.pullNumber}: ${mode}`
  );

  const branchAdvances = planBranch({ git, mode, branch, candidate, range });
  const milestones = planMilestones({
    allMilestones: await gh.listMilestones('all'),
    version,
    candidateVersion: candidate?.version ?? null,
  });

  return {
    mode,
    candidate,
    previousVersion,
    version,
    bumpKind,
    classification,
    versionSource,
    range,
    integrationCount: integrations.length,
    pullRequests,
    attention: toAttentionRecords(records),
    warnings: [
      ...toWarnings(records),
      ...(candidate === null ? [] : crossCheckCandidate(candidate)),
    ],
    milestones,
    branch,
    branchAdvances,
    realignment: planRealignment(pullRequests, milestones.shipping),
  };
}

/**
 * Decides what has to happen to the release branch, and refuses what must not.
 *
 * @returns `false` when the branch already points at the pinned head, which is the case where
 * nothing landed since the last run. Pushing anyway would fire `synchronize` on the pull request
 * and publish another identical experimental artifact for nothing.
 */
function planBranch(input: {
  git: GitAdapter;
  mode: ReleaseMode;
  branch: string;
  candidate: Candidate | null;
  range: PinnedRange;
}): boolean {
  const { git, mode, branch, candidate, range } = input;

  if (mode !== 'refresh' && git.remoteBranchExists(branch) === true) {
    throw new Error(
      `The branch ${branch} already exists but no open pull request is drafting it. ` +
        'An earlier run left it behind. Delete it, or reopen its pull request, before drafting.'
    );
  }

  if (candidate === null) {
    return true;
  }

  if (git.remoteBranchExists(candidate.branch) === false) {
    throw new Error(
      `#${candidate.pullNumber} is open against ${candidate.branch}, but that branch is gone from ` +
        'the remote. Close the pull request, or restore the branch, before drafting.'
    );
  }

  // The branch a candidate lives on is only ever a pointer into `develop`. Whether this run
  // advances it or replaces it, a commit pushed to it directly would be discarded, so both paths
  // refuse before writing anything.
  git.fetchBranch(candidate.branch);

  const branchHeadSha = git.resolveSha(`origin/${candidate.branch}`);

  assertBranchContained({
    branch: candidate.branch,
    branchHeadSha,
    sourceRef: range.toRef,
    sourceSha: range.toSha,
    contained: git.isAncestor(branchHeadSha, range.toSha),
  });

  return mode === 'redraft' || branchHeadSha !== range.toSha;
}

/**
 * Performs a plan.
 *
 * The order matters in one place: the milestone moves happen before the branch and the pull
 * request, so work in flight has somewhere to go as early as possible. `check-pr-status` fails any
 * pull request targeting `develop` without a milestone.
 */
export async function applyRelease(
  plan: ReleasePlan,
  deps: DraftReleaseDeps
): Promise<DraftReleaseResult> {
  const { inputs, git, gh, journal, logger } = deps;
  const generatedAt = (deps.clock ?? ((): string => new Date().toISOString()))();

  // 1. Milestones.
  const shippingNumber = await applyShippingMilestone(journal, gh, plan.milestones.shipping);
  const nextNumber = await applyNextMilestone(journal, gh, plan.milestones.next);

  await applyRealignment(journal, gh, plan.realignment, shippingNumber);

  const milestoneItems = shippingNumber === null ? [] : await gh.listMilestoneItems(shippingNumber);
  const cleanup = planCleanup(milestoneItems, nextNumber);

  await applyCleanup(journal, gh, cleanup, plan.milestones);

  if (plan.milestones.shipping.close === true) {
    await journal.write(
      {
        op: 'milestone.close',
        target: `milestone/${shippingNumber ?? '<new>'}`,
        before: 'open',
        after: 'closed',
        detail: plan.milestones.shipping.title,
      },
      async () => {
        if (shippingNumber === null) {
          return null;
        }

        return gh.updateMilestone(shippingNumber, { state: 'closed' });
      }
    );
  }

  // 2. Branch.
  if (plan.branchAdvances === true) {
    await journal.write(
      {
        op: 'branch.push',
        target: `refs/heads/${plan.branch}`,
        after: plan.range.toSha,
        detail:
          plan.mode === 'refresh'
            ? `advanced to ${plan.range.toRef}`
            : `cut from ${plan.range.toRef}`,
      },
      async () => git.pushBranch(plan.range.toSha, plan.branch)
    );
  } else {
    logger.info(`${plan.branch} already points at ${plan.range.toSha}, nothing to push.`);
  }

  // 3. Pull request. A refresh keeps the one in flight, with its reviews and its comments.
  const { pullNumber, pullUrl } = await applyPullRequest(journal, gh, plan);

  await journal.write(
    { op: 'pr.label', target: pullTarget(pullNumber), after: EXPERIMENTAL_LABEL },
    async () => {
      if (pullNumber === null) {
        return;
      }

      await gh.addLabels(pullNumber, [EXPERIMENTAL_LABEL]);
    }
  );

  // 4. Report.
  const payload = buildPayload({
    generatedAt,
    coords: gh.coords,
    dryRun: inputs.dryRun,
    version: plan.version,
    bump: plan.bumpKind,
    previousVersion: plan.previousVersion,
    versionSource: plan.versionSource,
    mode: plan.mode,
    range: plan.range,
    integrationCount: plan.integrationCount,
    branch: plan.branch,
    branchAdvanced: plan.branchAdvances,
    pullNumber,
    pullUrl,
    classification: plan.classification,
    pullRequests: plan.pullRequests,
    attention: plan.attention,
    milestones: {
      shipping: {
        number: shippingNumber,
        title: plan.milestones.shipping.title,
        renamedFrom:
          plan.milestones.shipping.action === 'rename'
            ? plan.milestones.shipping.currentTitle
            : null,
        state: 'closed',
      },
      next: {
        number: nextNumber,
        title: plan.milestones.next.title,
        created: plan.milestones.next.action === 'create',
      },
    },
    // Read after the realignment, so an applied run reports the corrected state and a dry run
    // reports the drift it would correct. The `inMilestoneNotInHistory` direction still earns its
    // place either way: it catches a pull request someone filed under this release that never
    // landed in the range.
    reconciliation: reconcile(plan.pullRequests, milestoneItems),
  });

  const body = renderBody({
    payload,
    pullRequests: plan.pullRequests,
    attention: plan.attention,
    warnings: plan.warnings,
    supersedes: plan.mode === 'redraft' ? plan.candidate : null,
  });

  await journal.write(
    { op: 'pr.body', target: pullTarget(pullNumber), after: `Release ${plan.version}` },
    async () => {
      if (pullNumber === null) {
        return;
      }

      await gh.updatePullBody(pullNumber, body);
    }
  );

  // 5. Retire the candidate this run replaced, once its replacement exists.
  if (plan.mode === 'redraft' && plan.candidate !== null) {
    await applySupersede(journal, gh, git, plan.candidate, { pullNumber, branch: plan.branch });
  }

  // 6. The per-run record of what this run pulled in.
  const comment = renderMilestoneComment({
    version: plan.version,
    nextTitle: plan.milestones.next.title,
    mode: plan.mode,
    entries: journal.entries(),
    dryRun: inputs.dryRun,
  });

  await journal.write({ op: 'pr.comment', target: pullTarget(pullNumber) }, async () => {
    if (pullNumber === null) {
      return;
    }

    await gh.createComment(pullNumber, comment);
  });

  return {
    branch: plan.branch,
    bump: plan.bumpKind,
    cleanup,
    journal: journal.toJSON(),
    mode: plan.mode,
    payload,
    pullNumber,
    pullUrl,
    summary: renderStepSummary({ payload, entries: journal.entries() }),
    version: plan.version,
    warnings: plan.warnings,
  };
}

/** Decides the whole release, then performs it. */
export async function runDraftRelease(deps: DraftReleaseDeps): Promise<DraftReleaseResult> {
  return applyRelease(await preflightRelease(deps), deps);
}

function pullTarget(pullNumber: number | null): string {
  return pullNumber === null ? 'pulls/<new>' : `pulls/${pullNumber}`;
}

/** A failed API call must never be reported as a commit pushed straight to the base branch. */
function assertNoFailedLookups(records: readonly AttributionRecord[]): void {
  const failed = records.filter((record) => record.status === 'lookup-failed');

  if (failed.length === 0) {
    return;
  }

  throw new Error(
    `${failed.length} commit-to-pulls lookups failed ` +
      `(${failed.map((record) => record.sha.slice(0, 8)).join(', ')}). ` +
      'A failed lookup must never be reported as a direct commit. Re-run the action.'
  );
}

function toAttentionRecords(records: readonly AttributionRecord[]): AttentionRecord[] {
  return records
    .filter((record) => ATTENTION_STATUSES.has(record.status) === true)
    .map((record) => ({
      sha: record.sha,
      subject: record.subject,
      status: record.status,
      reason: record.reason,
    }));
}

function toWarnings(records: readonly AttributionRecord[]): string[] {
  return records.flatMap((record) =>
    record.warnings.length === 0 || record.pull === null
      ? []
      : [
          `\`${record.sha.slice(0, 8)}\` resolved to #${record.pull.number} but its head is not ` +
            `the second parent (${record.warnings.join(', ')}).`,
        ]
  );
}

type VersionDecision = {
  version: string;
  bumpKind: BumpKind;
  classification: BumpClassification;
  versionSource: VersionSource;
};

/**
 * Decides the release version.
 *
 * The explicit `version` input bypasses the commit rule. Everything else is decided from what
 * landed in the range. The classification is computed either way, because the report carries the
 * evidence even when a human overrode the answer.
 */
export async function resolveVersion(input: {
  inputs: Pick<DraftReleaseInputs, 'version'>;
  previousVersion: string;
  integrations: readonly Integration[];
  records: readonly AttributionRecord[];
  listPullCommits: GithubAdapter['listPullCommits'];
}): Promise<VersionDecision> {
  const classification = await classifyIntegrations(
    input.integrations,
    input.records,
    input.listPullCommits
  );

  const previous = parseStable(input.previousVersion);

  if (previous === null) {
    throw new Error(`The published baseline "${input.previousVersion}" is not a stable version.`);
  }

  if (input.inputs.version !== '') {
    const parsed = parseStable(input.inputs.version);

    if (parsed === null) {
      throw new Error(`The version input "${input.inputs.version}" is not a stable x.y.z version.`);
    }

    if (compareStable(parsed, previous) !== 1) {
      throw new Error(
        `The version input ${input.inputs.version} is not greater than the published baseline ` +
          `${input.previousVersion}.`
      );
    }

    return {
      version: input.inputs.version,
      bumpKind: parsed.minor === previous.minor ? 'patch' : 'minor',
      classification,
      versionSource: 'version-input',
    };
  }

  const bumpKind = decideBump(classification);

  return {
    version: increment(input.previousVersion, bumpKind),
    bumpKind,
    classification,
    versionSource: 'computed',
  };
}

/** @returns The shipping milestone number, or `null` on a dry run that would have created it. */
async function applyShippingMilestone(
  journal: Journal,
  gh: GithubAdapter,
  plan: MilestonePlan['shipping']
): Promise<number | null> {
  if (plan.action === 'keep') {
    return plan.number;
  }

  if (plan.action === 'rename') {
    await journal.write(
      {
        op: 'milestone.rename',
        target: `milestone/${plan.number ?? '<new>'}`,
        before: plan.currentTitle,
        after: plan.title,
        detail: 'shipping',
      },
      async () => {
        if (plan.number === null) {
          return null;
        }

        return gh.updateMilestone(plan.number, { title: plan.title });
      }
    );

    return plan.number;
  }

  const created = await journal.write(
    { op: 'milestone.create', target: 'milestones', after: plan.title, detail: 'shipping' },
    async () => gh.createMilestone(plan.title)
  );

  return created?.number ?? null;
}

/** @returns The next milestone number, or `null` on a dry run that would have created it. */
async function applyNextMilestone(
  journal: Journal,
  gh: GithubAdapter,
  plan: MilestonePlan['next']
): Promise<number | null> {
  if (plan.action === 'reuse') {
    return plan.number;
  }

  if (plan.action === 'rename') {
    await journal.write(
      {
        op: 'milestone.rename',
        target: `milestone/${plan.number ?? '<new>'}`,
        before: plan.currentTitle,
        after: plan.title,
        detail: 'next',
      },
      async () => {
        if (plan.number === null) {
          return null;
        }

        return gh.updateMilestone(plan.number, { title: plan.title });
      }
    );

    return plan.number;
  }

  const created = await journal.write(
    { op: 'milestone.create', target: 'milestones', after: plan.title, detail: 'next' },
    async () => gh.createMilestone(plan.title)
  );

  return created?.number ?? null;
}

/**
 * Corrects the milestone of every pull request that shipped.
 *
 * Sequential on purpose: a release milestone carries dozens of items and GitHub throttles parallel
 * issue writes.
 */
async function applyRealignment(
  journal: Journal,
  gh: GithubAdapter,
  realignment: readonly RealignItem[],
  shippingNumber: number | null
): Promise<void> {
  for (const item of realignment) {
    await journal.write(
      {
        op: 'issue.milestone.set',
        target: `issues/${item.number}`,
        before: item.from,
        after: item.toTitle,
        detail: 'Merged inside the release range.',
      },
      async () => {
        if (shippingNumber === null) {
          return;
        }

        await gh.setIssueMilestone(item.number, shippingNumber);
      }
    );
  }
}

async function applyCleanup(
  journal: Journal,
  gh: GithubAdapter,
  cleanup: readonly CleanupItem[],
  milestonePlan: MilestonePlan
): Promise<void> {
  // Sequential on purpose: a release milestone carries dozens of items and GitHub throttles
  // parallel issue writes.
  for (const item of cleanup) {
    if (item.action === 'keep') {
      continue;
    }

    const moving = item.action === 'move';

    await journal.write(
      {
        op: moving === true ? 'issue.milestone.set' : 'issue.milestone.clear',
        target: `issues/${item.number}`,
        before: milestonePlan.shipping.title,
        after: moving === true ? milestonePlan.next.title : null,
        detail: item.reason,
      },
      async () => {
        await gh.setIssueMilestone(item.number, moving === true ? item.to : null);
      }
    );
  }
}

/**
 * @returns The pull request the report lands on. A refresh reuses the candidate's, so its reviews,
 * its comments and its `publish-experimental` label all survive.
 */
async function applyPullRequest(
  journal: Journal,
  gh: GithubAdapter,
  plan: ReleasePlan
): Promise<{ pullNumber: number | null; pullUrl: string | null }> {
  if (plan.mode === 'refresh' && plan.candidate !== null) {
    return { pullNumber: plan.candidate.pullNumber, pullUrl: plan.candidate.pullUrl };
  }

  const title = `Release ${plan.version}`;
  const created = await journal.write(
    { op: 'pr.create', target: `${plan.branch} → ${RELEASE_BASE}`, after: title },
    async () =>
      gh.createPull({
        head: plan.branch,
        base: RELEASE_BASE,
        title,
        body: `Release \`${plan.version}\`. The attribution report lands here once the run finishes.`,
      })
  );

  return { pullNumber: created?.number ?? null, pullUrl: created?.html_url ?? null };
}

/**
 * Retires the candidate a redraft replaced.
 *
 * Only reached once the replacement exists, so the release is never without a candidate. The branch
 * goes too: two release branches side by side is an invitation to publish the wrong one.
 */
async function applySupersede(
  journal: Journal,
  gh: GithubAdapter,
  git: GitAdapter,
  candidate: Candidate,
  replacement: { pullNumber: number | null; branch: string }
): Promise<void> {
  const reference =
    replacement.pullNumber === null ? `\`${replacement.branch}\`` : `#${replacement.pullNumber}`;

  await journal.write(
    {
      op: 'pr.comment',
      target: `pulls/${candidate.pullNumber}`,
      detail: `superseded by ${reference}`,
    },
    async () =>
      gh.createComment(
        candidate.pullNumber,
        `Superseded by ${reference}. The commits that landed since this candidate was drafted ` +
          `changed the release version, so \`${candidate.branch}\` is replaced by ` +
          `\`${replacement.branch}\`.`
      )
  );

  await journal.write(
    {
      op: 'pr.close',
      target: `pulls/${candidate.pullNumber}`,
      before: 'open',
      after: 'closed',
      detail: `superseded by ${reference}`,
    },
    async () => gh.closePull(candidate.pullNumber)
  );

  await journal.write(
    {
      op: 'branch.delete',
      target: `refs/heads/${candidate.branch}`,
      before: candidate.pullHeadSha,
      detail: `superseded by ${replacement.branch}`,
    },
    async () => git.deleteBranch(candidate.branch)
  );
}
