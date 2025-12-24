/**
 * Model cache to prevent redundant getModel() calls during populate traversal.
 *
 * Models don't change at runtime (changes require server restart), so caching
 * is safe. Current scoping (per-request) provides isolation and predictable
 * memory behavior.
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
