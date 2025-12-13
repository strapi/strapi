/**
 * Model cache for performance optimization.
 *
 * Prevents redundant getModel() calls which can number 100-200+ for complex
 * populate queries.
 *
 * Usage patterns:
 * - Instance-scoped: In permission managers (created per request, garbage collection handles cleanup)
 * - Function-scoped: In validateParams (cleared defensively, but garbage collection handles it)
 *
 * Note: Models don't change at runtime (changes require server restart), so this
 * cache could theoretically be global. Current scoping provides isolation and
 * predictable memory behavior.
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
 * Creates cache for getModel() calls.
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
