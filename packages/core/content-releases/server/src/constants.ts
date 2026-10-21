export const RELEASE_MODEL_UID = 'plugin::content-releases.release';
export const RELEASE_ACTION_MODEL_UID = 'plugin::content-releases.release-action';

export const RELEASE_CONDITIONS = ['allow_partial', 'all_or_nothing'] as const;
export type ReleaseCondition = (typeof RELEASE_CONDITIONS)[number];
export const DEFAULT_RELEASE_CONDITION = 'all_or_nothing' satisfies ReleaseCondition;

// Planned (empty, ready, blocked) until a run, then frozen (done, partial, failed)
export const RELEASE_STATUSES = ['ready', 'blocked', 'failed', 'done', 'partial', 'empty'] as const;
export type ReleaseStatus = (typeof RELEASE_STATUSES)[number];

// A release action no run has recorded, in a release that hasn't run. The relation filter is a
// left join: the id check keeps out actions whose release no longer exists.
export const PLANNED_ACTION_WHERE = {
  outcome: null,
  release: { id: { $notNull: true }, releasedAt: { $null: true } },
};

// A release action that can't publish now: an unpublish needs no checks, and a publish whose
// validity was never recorded (an action stored before validation existed) counts as not ready
export const NOT_READY_ACTION_WHERE = {
  type: 'publish' as const,
  $or: [{ isEntryValid: false }, { isEntryValid: { $null: true } }],
};

// What the entries of a release can be narrowed to: their readiness, or what the run did with them
export const RELEASE_ACTION_FILTERS = ['ready', 'notReady', 'released', 'skipped'] as const;
export type ReleaseActionFilter = (typeof RELEASE_ACTION_FILTERS)[number];

export const RELEASE_FAILURE_REASONS = ['missed_schedule', 'failed_before_upgrade'] as const;
export type ReleaseFailureReason = (typeof RELEASE_FAILURE_REASONS)[number];

export const OVERDUE_GRACE_PERIOD_MS = 5 * 60 * 1000;
export const OVERDUE_SWEEP_CRON_RULE = '* * * * *';

export const ACTIONS = [
  {
    section: 'plugins',
    displayName: 'Read',
    uid: 'read',
    pluginName: 'content-releases',
  },
  {
    section: 'plugins',
    displayName: 'Create',
    uid: 'create',
    pluginName: 'content-releases',
  },
  {
    section: 'plugins',
    displayName: 'Edit',
    uid: 'update',
    pluginName: 'content-releases',
  },
  {
    section: 'plugins',
    displayName: 'Delete',
    uid: 'delete',
    pluginName: 'content-releases',
  },
  {
    section: 'plugins',
    displayName: 'Publish',
    uid: 'publish',
    pluginName: 'content-releases',
  },
  {
    section: 'plugins',
    displayName: 'Remove an entry from a release',
    uid: 'delete-action',
    pluginName: 'content-releases',
  },
  {
    section: 'plugins',
    displayName: 'Add an entry to a release',
    uid: 'create-action',
    pluginName: 'content-releases',
  },

  // Settings
  {
    uid: 'settings.read',
    section: 'settings',
    displayName: 'Read',
    category: 'content releases',
    subCategory: 'options',
    pluginName: 'content-releases',
  },

  {
    uid: 'settings.update',
    section: 'settings',
    displayName: 'Edit',
    category: 'content releases',
    subCategory: 'options',
    pluginName: 'content-releases',
  },
];

export const ALLOWED_WEBHOOK_EVENTS = {
  RELEASES_PUBLISH: 'releases.publish',
};

/**
 * Audit Log events, transformed in audit-logs.ts and registered during bootstrap.
 *
 * RELEASE_TRIGGER is different from the releases.publish webhook.
 * The webhook has its own payload format, which is already a public contract.
 *
 * TODO: Decide whether these should eventually converge when the
 * releases.publish payload is revised: replace it with release.trigger,
 * or keep both formats permanently.
 */
export const AUDITED_EVENTS = {
  RELEASE_CREATE: 'release.create',
  RELEASE_UPDATE: 'release.update',
  RELEASE_DELETE: 'release.delete',
  RELEASE_TRIGGER: 'release.trigger',
  RELEASE_ENTRY_ADD: 'release.entry.add',
  RELEASE_ENTRY_UPDATE: 'release.entry.update',
  RELEASE_ENTRY_REMOVE: 'release.entry.remove',
  RELEASE_SETTINGS_UPDATE: 'release.settings.update',
} as const;
