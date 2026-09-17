// Copied from packages/plugins/branches/server/src/codec/constants.ts — keep structurally
// in sync; extraction into a shared package is planned once both plugins are merged.
/**
 * Attributes that never enter a snapshot: identity, dimensions, timestamps,
 * creators, workflow bookkeeping and the dimension FKs themselves. They are
 * either derived, owned by the row, or owned by another plugin.
 */
export const EXCLUDED_ATTRIBUTES = new Set([
  'id',
  'documentId',
  'locale',
  'localizations',
  'publishedAt',
  'firstPublishedAt',
  'createdAt',
  'updatedAt',
  'createdBy',
  'updatedBy',
  'branch',
  'space',
  'strapi_stage',
  'strapi_assignee',
]);

/** Attribute types whose values live in their own tables and are populated, not selected. */
export const POPULATED_TYPES = new Set(['relation', 'media', 'component', 'dynamiczone']);
