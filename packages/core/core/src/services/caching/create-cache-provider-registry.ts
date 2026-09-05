import type { Modules } from '@strapi/types';

type CacheProviderRegistry = Modules.Cache.CacheProviderRegistry;
type CacheProviderFactory = Modules.Cache.CacheProviderFactory;

export const createCacheProviderRegistry = (): CacheProviderRegistry => {
  const factories = new Map<string, CacheProviderFactory>();

  return {
    register(name: string, factory: CacheProviderFactory) {
      if (factories.has(name)) {
        throw new Error(`Cache provider "${name}" is already registered`);
      }
      factories.set(name, factory);
    },

    has(name: string) {
      return factories.has(name);
    },

    get(name: string) {
      return factories.get(name);
    },

    getRegisteredNames() {
      return [...factories.keys()];
    },
  };
};
