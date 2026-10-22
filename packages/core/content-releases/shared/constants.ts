export const RELEASE_CONDITIONS = ['allow_partial', 'all_or_nothing'] as const;
export type ReleaseCondition = (typeof RELEASE_CONDITIONS)[number];
export const DEFAULT_RELEASE_CONDITION = 'all_or_nothing' satisfies ReleaseCondition;

// Planned (empty, ready, blocked) until a run, then frozen (done, partial, failed). A `failed`
// release without `releasedAt` failed before the upgrade: planned until the overdue sweep freezes it.
export const RELEASE_STATUSES = ['ready', 'blocked', 'failed', 'done', 'partial', 'empty'] as const;
export type ReleaseStatus = (typeof RELEASE_STATUSES)[number];

export const RELEASE_FAILURE_REASONS = ['missed_schedule', 'failed_before_upgrade'] as const;
export type ReleaseFailureReason = (typeof RELEASE_FAILURE_REASONS)[number];

// The outcome of an entry the run released, by action type
export const RELEASED_OUTCOME_BY_TYPE = { publish: 'published', unpublish: 'unpublished' } as const;
export const RELEASED_OUTCOMES = Object.values(RELEASED_OUTCOME_BY_TYPE);

// What happened to an entry when its release froze. Null until then.
export const RELEASE_ACTION_OUTCOMES = [
  ...RELEASED_OUTCOMES,
  'skipped_invalid',
  'skipped_not_approved',
  'skipped_error',
  // Publishable, but an `all_or_nothing` run released nothing
  'skipped_held',
  // The release froze without running: its schedule passed, or it failed before the upgrade
  'skipped_missed',
] as const;
export type ReleaseActionOutcome = (typeof RELEASE_ACTION_OUTCOMES)[number];

// What the entries of a release can be narrowed to: their readiness, or what the run did with them
export const RELEASE_ACTION_FILTERS = ['ready', 'notReady', 'released', 'skipped'] as const;
export type ReleaseActionFilter = (typeof RELEASE_ACTION_FILTERS)[number];
