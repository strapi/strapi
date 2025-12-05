/**
 * Request-scoped model cache for performance optimization.
 *
 * This cache prevents redundant calls to getModel() within a single request,
 *
 * The cache is request-scoped and must be cleared after each request to prevent
 * stale data from being cached across requests.
 *
 * @example
 * ```typescript
 * const modelCache = createModelCache(strapi.getModel.bind(strapi));
 * const model = modelCache.getModel('api::article.article');
 * // ... use the model
 * modelCache.clear(); // Clean up after request
 * ```
 */

/**
 * Creates a request-scoped cache for getModel() calls.
 *
 * @param getModelFn - The underlying getModel function to cache
 * @returns An object with cached getModel function and clear method
 */
export const createModelCache = (getModelFn: (uid: any) => any) => {
  const cache = new Map<string, any>();

  return {
    getModel(uid: any): any {
      if (!cache.has(uid)) {
        cache.set(uid, getModelFn(uid));
      }

      return cache.get(uid)!;
    },
    clear() {
      cache.clear();
    },
  };
};
