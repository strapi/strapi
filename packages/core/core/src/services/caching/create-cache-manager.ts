import type { Modules } from '@strapi/types';

type CacheManagerService = Modules.Cache.CacheManagerService;
type CacheProviderRegistry = Modules.Cache.CacheProviderRegistry;
type CacheProviderStrapiContext = Modules.Cache.CacheProviderStrapiContext;
type CacheProvider = Modules.Cache.CacheProvider;

export const createCacheManager = ({
  strapi,
  registry,
}: {
  strapi: CacheProviderStrapiContext;
  registry: CacheProviderRegistry;
}): CacheManagerService => {
  const instances = new Map<string, CacheProvider>();

  const resolveDefaultProviderName = (): string => {
    const serverCache = strapi.config.get('server.cache') as
      | { defaultProvider?: string }
      | undefined;
    const name = serverCache?.defaultProvider;
    return name && typeof name === 'string' && name.length > 0 ? name : 'memory';
  };

  const resolveProviderName = (override?: string): string => {
    if (override && typeof override === 'string' && override.length > 0) {
      return override;
    }
    return resolveDefaultProviderName();
  };

  const getProvider = (name: string): CacheProvider => {
    if (!instances.has(name)) {
      const factory = registry.get(name);
      if (!factory) {
        throw new Error(`Unknown cache provider "${name}"`);
      }
      const serverCache = strapi.config.get('server.cache') as
        | { providers?: Record<string, Record<string, unknown>> }
        | undefined;
      const options = serverCache?.providers?.[name] ?? {};
      instances.set(name, factory({ strapi, options }));
    }
    return instances.get(name)!;
  };

  return {
    async get(namespace, key, options) {
      const name = resolveProviderName(options?.provider);
      return getProvider(name).get(namespace, key);
    },

    async set(namespace, key, value, options) {
      const name = resolveProviderName(options?.provider);
      const { provider: _ignored, ...rest } = options ?? {};
      return getProvider(name).set(namespace, key, value, rest);
    },

    async delete(namespace, key, options) {
      const name = resolveProviderName(options?.provider);
      return getProvider(name).delete(namespace, key);
    },
  };
};
