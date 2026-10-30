/**
 * Future flag gating the feature. While it is off, the position attribute is not added
 * to the content types and the Content Manager behaves as before.
 */
export const FUTURE_FLAG = 'unstableCustomOrder';

/**
 * Hidden attribute holding the position of a document in the custom order of its
 * collection type. Every row of a document (all locales, draft and published) shares
 * the same value. Lower comes first.
 */
export const POSITION_ATTRIBUTE = 'strapi_position';

/**
 * How long an instance trusts its view of which content types have custom order enabled
 * before reading the settings again. The setting can be changed at runtime from another
 * instance.
 */
export const ENABLED_CACHE_TTL_MS = 10_000;
