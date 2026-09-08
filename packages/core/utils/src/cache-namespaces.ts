/**
 * Namespace strings for internal Strapi cache entries (memory provider, database cache
 * table, etc.). Shared across packages without coupling admin ↔ core.
 */
export const INTERNAL_CACHE_NS = {
  /** Document service `getDeepPopulate` (sync hot path; uses memoryCacheSync). */
  DOCUMENT_DEEP_POPULATE: 'strapi::document-service::deep-populate',
  /** Content-manager validation populate (`getPopulateForValidation`). */
  CM_VALIDATION_POPULATE: 'strapi::content-manager::validation-populate',
  /** Content-manager draft/relation count populate (`getDeepPopulateDraftCount`). */
  CM_DRAFT_COUNT_POPULATE: 'strapi::content-manager::draft-count-populate',
  /** Content-manager `buildDeepPopulate` (async; uses strapi.cacheManager + memory). */
  CM_DEEP_POPULATE_BUILD: 'strapi::content-manager::deep-populate-build',
  /** EE admin AI JWT token cache (async; uses strapi.cacheManager + memory). */
  EE_AI_TOKEN: 'strapi::ee::ai-token',
  /**
   * Admin panel auth: cached permission list + user snapshot per session
   * (`strapi.cacheManager` with `provider: 'database'` for cross-replica consistency).
   */
  ADMIN_AUTH_ABILITY: 'strapi::admin::auth-ability',
} as const;
