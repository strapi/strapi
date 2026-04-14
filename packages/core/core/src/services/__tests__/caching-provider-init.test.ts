import cachingProvider from '../../providers/caching';
import { cacheEntryModel } from '../caching/cache-entry-model';

describe('caching provider init', () => {
  it('registers cache entry model, built-in providers, and exposes cache manager', () => {
    const models = { add: jest.fn() };
    const resolvers = new Map<string, unknown>();

    const strapi: any = {
      get(name: string) {
        if (name === 'models') {
          return models;
        }
        if (name === 'cacheProviderRegistry') {
          return resolvers.get('cacheProviderRegistry');
        }
        if (name === 'cacheManager') {
          const fn = resolvers.get('cacheManager') as (s: unknown) => unknown;
          return fn(strapi);
        }
        throw new Error(`unexpected get ${name}`);
      },
      add(name: string, resolver: unknown) {
        resolvers.set(name, resolver);
      },
      db: {
        query: jest.fn(() => ({
          findOne: jest.fn(async () => null),
          create: jest.fn(async () => ({})),
          update: jest.fn(async () => ({})),
          delete: jest.fn(async () => ({})),
        })),
      },
      config: {
        get: jest.fn((path: string) => {
          if (path === 'server.cache') {
            return {};
          }
          return undefined;
        }),
      },
    };

    cachingProvider.init!(strapi);

    expect(models.add).toHaveBeenCalledWith(cacheEntryModel);

    const registry = resolvers.get('cacheProviderRegistry') as {
      getRegisteredNames: () => string[];
    };
    expect(registry.getRegisteredNames()).toEqual(['memory', 'database']);

    const manager = strapi.get('cacheManager');
    expect(manager).toBeDefined();
    expect(typeof manager.get).toBe('function');
    expect(typeof manager.set).toBe('function');
    expect(typeof manager.delete).toBe('function');
  });
});
