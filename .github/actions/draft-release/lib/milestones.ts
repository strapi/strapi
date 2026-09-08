import { nextPatchOf } from './semver.ts';

import type {
  AttributedPull,
  CleanupItem,
  Milestone,
  MilestoneItem,
  MilestonePlan,
  Reconciliation,
} from './types.ts';

/**
 * Plans the milestone moves for a release.
 *
 * The repository keeps exactly one open milestone, named after the next release. This action makes
 * that milestone match what actually landed, opens the one that collects the following release, and
 * closes the shipping one.
 *
 * @param allMilestones - Every milestone in any state, so an already created next milestone is
 * reused instead of duplicated.
 */
export function planMilestones(
  openMilestones: readonly Milestone[],
  version: string,
  allMilestones: readonly Milestone[]
): MilestonePlan {
  if (openMilestones.length > 1) {
    const titles = openMilestones.map((milestone) => milestone.title).join(', ');

    throw new Error(
      `Expected at most one open milestone, found ${openMilestones.length} (${titles}). ` +
        'Close the extra ones before drafting a release.'
    );
  }

  const nextTitle = nextPatchOf(version);
  const existingNext = allMilestones.find((milestone) => milestone.title === nextTitle);
  const [open] = openMilestones;

  const shipping =
    open === undefined
      ? { action: 'create' as const, number: null, currentTitle: null, title: version }
      : {
          action: open.title === version ? ('keep' as const) : ('rename' as const),
          number: open.number,
          currentTitle: open.title,
          title: version,
        };

  const next =
    existingNext === undefined
      ? { action: 'create' as const, number: null, title: nextTitle }
      : { action: 'reuse' as const, number: existingNext.number, title: nextTitle };

  return { shipping, next };
}

function isMerged(item: MilestoneItem): boolean {
  return item.pull_request?.merged_at !== null && item.pull_request?.merged_at !== undefined;
}

/**
 * Plans the cleanup of the milestone that is being closed.
 *
 * A closed milestone should describe exactly one thing: the pull requests that shipped in that
 * release. Everything else moves on or is cleared.
 */
export function planCleanup(
  items: readonly MilestoneItem[],
  nextMilestoneNumber: number | null
): CleanupItem[] {
  return items.map((item) => {
    const common = { number: item.number, title: item.title ?? '', to: null };

    if (item.pull_request === null || item.pull_request === undefined) {
      return {
        ...common,
        kind: 'issue',
        action: 'clear',
        reason: 'Issues are planning artifacts, not shipped work.',
      };
    }

    if (isMerged(item) === true) {
      return {
        ...common,
        kind: 'pull',
        action: 'keep',
        reason: 'Merged, so it belongs to this release.',
      };
    }

    if (item.state === 'open') {
      return {
        ...common,
        kind: 'pull',
        action: 'move',
        to: nextMilestoneNumber,
        reason: 'Still open, so it targets the next release.',
      };
    }

    return {
      ...common,
      kind: 'pull',
      action: 'clear',
      reason: 'Closed without merging, so it shipped nothing.',
    };
  });
}

/**
 * Compares what history says shipped against what the milestone claims.
 *
 * Git history is the authority for what landed. The milestone is intent. Reporting both directions
 * answers the question people actually ask during a release: did anything slip.
 */
export function reconcile(
  attributed: readonly Pick<AttributedPull, 'number'>[],
  milestoneItems: readonly MilestoneItem[]
): Reconciliation {
  const attributedNumbers = new Set(attributed.map((pull) => pull.number));
  const milestoneMerged = milestoneItems.filter(isMerged).map((item) => item.number);
  const milestoneNumbers = new Set(milestoneMerged);

  const ascending = (left: number, right: number): number => left - right;

  return {
    inHistoryNotInMilestone: [...attributedNumbers]
      .filter((number) => milestoneNumbers.has(number) === false)
      .sort(ascending),
    inMilestoneNotInHistory: milestoneMerged
      .filter((number) => attributedNumbers.has(number) === false)
      .sort(ascending),
  };
}
