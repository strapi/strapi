export const PLUGIN_ID = 'channels';

export const CHANNEL_MODEL_UID = 'plugin::channels.channel';
export const OVERRIDE_MODEL_UID = 'plugin::channels.override';

/** Request header carrying the active channel slug. Absent (or `default`) = base content. */
export const CHANNEL_HEADER = 'X-Strapi-Channel';

/** The virtual base channel: no row, no overrides — the entry as stored. */
export const DEFAULT_CHANNEL_SLUG = 'default';

/**
 * `entryLocale` sentinel for "no locale" override rows (non-localized content
 * types, and the shared non-localized-attributes row of localized ones).
 * A real value — not NULL — so the unique index actually dedupes: SQL unique
 * indexes treat NULLs as distinct on every engine we support.
 */
export const NO_LOCALE = '';

/**
 * How many levels of relation hydration may re-enter the channels middleware
 * (a channel-overridden article populating a channel-overridden product…).
 * Beyond this depth targets are read as-is.
 */
export const MAX_OVERLAY_DEPTH = 3;

/**
 * Overlay writes never touch base rows, so the core `entry.*` webhook events
 * never fire for them: the plugin emits its own, declared to the webhook
 * store in bootstrap so they are subscribable from the webhooks UI.
 */
export const ALLOWED_WEBHOOK_EVENTS = {
  CHANNEL_ENTRY_UPDATE: 'channel.entry.update',
  CHANNEL_ENTRY_RESET: 'channel.entry.reset',
  CHANNEL_ENTRY_PUBLISH: 'channel.entry.publish',
  CHANNEL_ENTRY_UNPUBLISH: 'channel.entry.unpublish',
} as const;
