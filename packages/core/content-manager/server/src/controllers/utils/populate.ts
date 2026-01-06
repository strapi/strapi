/**
 * Get the populate depth for content manager operations.
 *
 * POC ONLY - NOT FOR PRODUCTION
 *
 * This env var can demonstrate that populateDeep(Infinity) as a performance bottleneck.
 *
 * However, limiting depth CAUSES DATA LOSS because the admin UI sends full form
 * state on save - unloaded deep levels get deleted by deleteOldComponents().
 * Proper fix requires admin UI lazy loading (separate refactor).
 */
export const getPopulateDepth = (): number => {
  const envDepth = process.env.STRAPI_CONTENT_MANAGER_MAX_POPULATE_DEPTH;
  if (envDepth) {
    const parsed = parseInt(envDepth, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return Infinity;
};
