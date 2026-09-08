import { nextPatchOf } from './semver.ts';

import type {
  AttributedPull,
  CleanupItem,
  Milestone,
  MilestoneItem,
  MilestonePlan,
  Reconciliation,
  RealignItem,
} from './types.ts';

function isOpen(milestone: Milestone): boolean {
  return milestone.state !== 'closed';
}

function findByTitle(milestones: readonly Milestone[], title: string): Milestone | undefined {
  return milestones.find((milestone) => milestone.title === title);
}

/**
 * Refuses to rename a milestone onto a title that is already taken.
 *
 * GitHub rejects a duplicate title, so this only turns a 422 into a sentence that says which
 * milestone is in the way. It is also the one check that catches a half-finished earlier run.
 */
function assertTitleFree(
  milestones: readonly Milestone[],
  title: string,
  keeping: number | null
): void {
  const taken = findByTitle(milestones, title);

  if (taken === undefined || taken.number === keeping) {
    return;
  }

  throw new Error(
    `A milestone titled ${title} already exists (#${taken.number}, ${taken.state ?? 'open'}). ` +
      'Rename or delete it before drafting this release.'
  );
}

/** The single open milestone, which is where work in flight collects. */
function soleOpenMilestone(
  milestones: readonly Milestone[],
  excluding: number | null
): Milestone | undefined {
  const open = milestones.filter(
    (milestone) => isOpen(milestone) === true && milestone.number !== excluding
  );

  if (open.length > 1) {
    const titles = open.map((milestone) => milestone.title).join(', ');

    throw new Error(
      `Expected at most one open milestone, found ${open.length} (${titles}). ` +
        'Close the extra ones before drafting a release.'
    );
  }

  return open[0];
}

/**
 * Plans the shipping milestone: the one that names this release.
 *
 * On a fresh draft it is the open milestone, renamed to whatever the commits decided. On a run that
 * revisits a candidate it is the milestone the candidate was cut under, found by title, and it is
 * already closed. A closed milestone still accepts item assignments through the REST API, so a
 * later run keeps filling it without reopening it.
 */
function planShipping(
  allMilestones: readonly Milestone[],
  version: string,
  candidateVersion: string | null
): MilestonePlan['shipping'] {
  if (candidateVersion === null) {
    const open = soleOpenMilestone(allMilestones, null);

    if (open === undefined) {
      assertTitleFree(allMilestones, version, null);

      return { action: 'create', number: null, currentTitle: null, title: version, close: true };
    }

    if (open.title === version) {
      return {
        action: 'keep',
        number: open.number,
        currentTitle: open.title,
        title: version,
        close: true,
      };
    }

    assertTitleFree(allMilestones, version, open.number);

    return {
      action: 'rename',
      number: open.number,
      currentTitle: open.title,
      title: version,
      close: true,
    };
  }

  const shipping = findByTitle(allMilestones, candidateVersion);

  if (shipping === undefined) {
    throw new Error(
      `No milestone is titled ${candidateVersion}, the version the open candidate was cut under. ` +
        'It was renamed or deleted after the candidate was drafted. Resolve it by hand.'
    );
  }

  if (candidateVersion === version) {
    return {
      action: 'keep',
      number: shipping.number,
      currentTitle: shipping.title,
      title: version,
      close: isOpen(shipping),
    };
  }

  assertTitleFree(allMilestones, version, shipping.number);

  return {
    action: 'rename',
    number: shipping.number,
    currentTitle: shipping.title,
    title: version,
    close: isOpen(shipping),
  };
}

/**
 * Plans the next milestone: the one that collects work for the release after this one.
 *
 * It has to be open, because GitHub only offers open milestones when someone opens a pull request,
 * and `check-pr-status` fails any pull request against `develop` without one.
 */
function planNext(
  allMilestones: readonly Milestone[],
  version: string,
  candidateVersion: string | null,
  shippingNumber: number | null
): MilestonePlan['next'] {
  const title = nextPatchOf(version);
  const open = soleOpenMilestone(allMilestones, shippingNumber);

  if (open === undefined) {
    const existing = findByTitle(allMilestones, title);

    if (existing !== undefined) {
      throw new Error(
        `No milestone is open, and the one titled ${title} is closed (#${existing.number}). ` +
          'Reopen it, or delete it, before drafting this release.'
      );
    }

    return { action: 'create', number: null, currentTitle: null, title };
  }

  if (open.title === title) {
    return { action: 'keep', number: open.number, currentTitle: open.title, title };
  }

  // On a fresh draft the open milestone became the shipping one, and `soleOpenMilestone` refused a
  // second, so an open milestone here always belongs to a candidate in flight. The next milestone
  // is therefore created or kept on a fresh draft, never renamed, and a rename here only ever means
  // the version drifted: the open milestone still names the next patch of the version the candidate
  // was cut under. The fresh-draft arm of the ternary is never taken; it narrows the type.
  const expected = candidateVersion === null ? title : nextPatchOf(candidateVersion);

  if (open.title !== expected) {
    throw new Error(
      `The open milestone is ${open.title}, but this release expects ${expected}. ` +
        'Resolve the milestones by hand before drafting.'
    );
  }

  assertTitleFree(allMilestones, title, open.number);

  return { action: 'rename', number: open.number, currentTitle: open.title, title };
}

/**
 * Plans the milestone moves for a release.
 *
 * The repository keeps exactly one open milestone, named after the next release. This action makes
 * the shipping milestone match what actually landed, keeps the one that collects the following
 * release open, and closes the shipping one.
 *
 * @param allMilestones - Every milestone in any state. The shipping one is closed for most of a
 * candidate's life, so a state filter would hide it.
 * @param candidateVersion - The version an open candidate was cut under, `null` on a fresh draft.
 * When it differs from `version`, the release drifted and both milestones are renamed.
 */
export function planMilestones(input: {
  allMilestones: readonly Milestone[];
  version: string;
  candidateVersion: string | null;
}): MilestonePlan {
  const shipping = planShipping(input.allMilestones, input.version, input.candidateVersion);

  // The two can never be the same milestone: `planNext` is told which one shipping took, and every
  // path it can return either excludes that number or carries none at all. Closing the shipping
  // milestone therefore always leaves one open for work in flight.
  const next = planNext(
    input.allMilestones,
    input.version,
    input.candidateVersion,
    shipping.number
  );

  return { shipping, next };
}

/**
 * Plans the milestone corrections for the pull requests that shipped.
 *
 * A pull request merged while a candidate is in flight carries the next release's milestone,
 * because that is the only one GitHub offers. It ships in this release regardless: `develop` is
 * what the release is cut from. History is therefore the authority and the milestone is corrected,
 * which also covers a pull request that carries no milestone or the wrong one entirely.
 */
export function planRealignment(
  pullRequests: readonly Pick<AttributedPull, 'number' | 'milestone'>[],
  shipping: { number: number | null; title: string }
): RealignItem[] {
  return pullRequests.flatMap((pull) =>
    pull.milestone === shipping.title
      ? []
      : [
          {
            number: pull.number,
            from: pull.milestone,
            toTitle: shipping.title,
          },
        ]
  );
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
