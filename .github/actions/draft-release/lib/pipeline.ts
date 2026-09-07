import {
  assertSupportedMergeMethods,
  dedupePullRequests,
  resolveIntegrations,
} from './attribution.ts';
import { classifyIntegrations, decideBump } from './bump.ts';
import { planCleanup, planMilestones, reconcile } from './milestones.ts';
import { fetchPackument, resolveLatestVersion } from './npm.ts';
import { pinRange } from './range.ts';
import { buildPayload, renderBody, renderMilestoneComment, renderStepSummary } from './report.ts';
import { compareStable, increment, parseStable } from './semver.ts';

import type { RegistryRequest } from './npm.ts';
import type {
  AttentionRecord,
  AttributionRecord,
  AttributionStatus,
  BumpClassification,
  BumpKind,
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
  ReleasePayload,
  VersionSource,
} from './types.ts';

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

export type DraftReleaseResult = {
  branch: string;
  bump: BumpKind;
  cleanup: CleanupItem[];
  journal: JournalSnapshot;
  payload: ReleasePayload;
  pullNumber: number | null;
  pullUrl: string | null;
  summary: string;
  version: string;
  warnings: string[];
};

/**
 * Orders the whole run.
 *
 * The order matters in two places. The range is pinned before anything else, so a pull request
 * merged while the action runs falls outside the release however long the run takes. And the
 * milestone moves happen before the branch and the pull request, so work in flight has somewhere to
 * go as early as possible: `check-pr-status` fails any pull request targeting `develop` without a
 * milestone.
 */
export async function runDraftRelease(deps: DraftReleaseDeps): Promise<DraftReleaseResult> {
  const { inputs, git, gh, journal, request, logger } = deps;
  const generatedAt = (deps.clock ?? ((): string => new Date().toISOString()))();

  // 0. Pin the range.
  assertSupportedMergeMethods(await gh.getRepository());

  const previousVersion = resolveLatestVersion(await fetchPackument(request));
  logger.info(`Published baseline: ${previousVersion}`);

  const pinned = pinRange(git, {
    baselineVersion: previousVersion,
    sourceRef: inputs.sourceRef,
  });
  logger.info(`Range pinned: ${pinned.fromRef} (${pinned.fromSha}) → ${pinned.toSha}`);

  const integrations = git.listIntegrations(pinned.fromSha, pinned.toSha);

  if (integrations.length === 0) {
    throw new Error(
      `Nothing to release: ${pinned.fromRef} and ${pinned.toRef} are the same commit.`
    );
  }

  logger.info(`${integrations.length} integrations to attribute`);

  // 1. Attribution.
  const records = await resolveIntegrations(
    integrations,
    { listPullsForCommit: gh.listPullsForCommit, getPull: gh.getPull },
    TARGET_BASE
  );

  assertNoFailedLookups(records);

  const attention = toAttentionRecords(records);
  const warnings = toWarnings(records);

  // 2. Version.
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

  // 3. Milestones.
  const allMilestones = await gh.listMilestones('all');
  const openMilestones = allMilestones.filter((milestone) => milestone.state === 'open');
  const milestonePlan = planMilestones(openMilestones, version, allMilestones);

  const shippingNumber = await applyShippingMilestone(journal, gh, milestonePlan.shipping);
  const nextNumber = await applyNextMilestone(journal, gh, milestonePlan.next);

  const milestoneItems = shippingNumber === null ? [] : await gh.listMilestoneItems(shippingNumber);

  await journal.write(
    {
      op: 'milestone.close',
      target: `milestone/${shippingNumber ?? '<new>'}`,
      before: 'open',
      after: 'closed',
      detail: milestonePlan.shipping.title,
    },
    async () => {
      if (shippingNumber === null) {
        return null;
      }

      return gh.updateMilestone(shippingNumber, { state: 'closed' });
    }
  );

  // 4. Branch, pull request, experimental label.
  const branch = `${RELEASE_BRANCH_NAME}/${version}`;

  if (git.remoteBranchExists(branch) === true) {
    throw new Error(`The branch ${branch} already exists. Delete it or pick another version.`);
  }

  await journal.write(
    {
      op: 'branch.push',
      target: `refs/heads/${branch}`,
      after: pinned.toSha,
      detail: `cut from ${pinned.toRef}`,
    },
    async () => git.pushBranch(pinned.toSha, branch)
  );

  const title = `Release ${version}`;
  const createdPull = await journal.write(
    { op: 'pr.create', target: `${branch} → ${RELEASE_BASE}`, after: title },
    async () =>
      gh.createPull({
        head: branch,
        base: RELEASE_BASE,
        title,
        body: `Release \`${version}\`. The attribution report lands here once the run finishes.`,
      })
  );

  const pullNumber = createdPull?.number ?? null;
  const pullUrl = createdPull?.html_url ?? null;

  await journal.write(
    { op: 'pr.label', target: pullTarget(pullNumber), after: EXPERIMENTAL_LABEL },
    async () => {
      if (pullNumber === null) {
        return;
      }

      await gh.addLabels(pullNumber, [EXPERIMENTAL_LABEL]);
    }
  );

  // 5. Report.
  const payload = buildPayload({
    generatedAt,
    coords: gh.coords,
    dryRun: inputs.dryRun,
    version,
    bump: bumpKind,
    previousVersion,
    versionSource,
    range: pinned,
    integrationCount: integrations.length,
    branch,
    pullNumber,
    pullUrl,
    classification,
    pullRequests,
    attention,
    milestones: {
      shipping: {
        number: shippingNumber,
        title: milestonePlan.shipping.title,
        renamedFrom:
          milestonePlan.shipping.action === 'rename' ? milestonePlan.shipping.currentTitle : null,
        state: 'closed',
      },
      next: {
        number: nextNumber,
        title: milestonePlan.next.title,
        created: milestonePlan.next.action === 'create',
      },
    },
    reconciliation: reconcile(pullRequests, milestoneItems),
  });

  const body = renderBody({ payload, pullRequests, attention, warnings });

  await journal.write({ op: 'pr.body', target: pullTarget(pullNumber), after: title }, async () => {
    if (pullNumber === null) {
      return;
    }

    await gh.updatePullBody(pullNumber, body);
  });

  // 6. Milestone cleanup and comment.
  const cleanup = planCleanup(milestoneItems, nextNumber);

  await applyCleanup(journal, gh, cleanup, milestonePlan);

  const comment = renderMilestoneComment({
    version,
    nextTitle: milestonePlan.next.title,
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
    branch,
    bump: bumpKind,
    cleanup,
    journal: journal.toJSON(),
    payload,
    pullNumber,
    pullUrl,
    summary: renderStepSummary({ payload, entries: journal.entries() }),
    version,
    warnings,
  };
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

  const created = await journal.write(
    { op: 'milestone.create', target: 'milestones', after: plan.title, detail: 'next' },
    async () => gh.createMilestone(plan.title)
  );

  return created?.number ?? null;
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
