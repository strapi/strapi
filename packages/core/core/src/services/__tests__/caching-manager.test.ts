import type { Modules } from '@strapi/types';
import { createCacheManager } from '../caching/create-cache-manager';
import { createCacheProviderRegistry } from '../caching/create-cache-provider-registry';

describe('createCacheManager', () => {
  const memory: Modules.Cache.CacheProvider = {
    get: jest.fn(async () => null),
    set: jest.fn(async () => {}),
    delete: jest.fn(async () => {}),
  };

  const database: Modules.Cache.CacheProvider = {
    get: jest.fn(async () => ({ value: 'db', createdAt: new Date(), updatedAt: new Date() })),
    set: jest.fn(async () => {}),
    delete: jest.fn(async () => {}),
  };

  const build = (serverCache: unknown) => {
    const registry = createCacheProviderRegistry();
    registry.register('memory', () => memory);
    registry.register('database', () => database);

    const strapi = {
      db: {} as any,
      config: {
        get: (path: string) => (path === 'server.cache' ? serverCache : undefined),
      },
    };

    return {
      manager: createCacheManager({ strapi, registry }),
      memory,
      database,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses memory by default when server.cache is missing', async () => {
    const { manager } = build({});
    await manager.get('n', 'k');

    expect(memory.get).toHaveBeenCalledWith('n', 'k');
    expect(database.get).not.toHaveBeenCalled();
  });

  it('uses defaultProvider from config', async () => {
    const { manager } = build({ defaultProvider: 'database' });
    await manager.set('n', 'k', 1);

    expect(database.set).toHaveBeenCalled();
    expect(memory.set).not.toHaveBeenCalled();
  });

  it('overrides default with options.provider', async () => {
    const { manager } = build({ defaultProvider: 'database' });
    await manager.get('n', 'k', { provider: 'memory' });

    expect(memory.get).toHaveBeenCalled();
    expect(database.get).not.toHaveBeenCalled();
  });

  it('throws for unknown provider', async () => {
    const registry = createCacheProviderRegistry();
    registry.register('memory', () => memory);
    const strapi = {
      db: {} as any,
      config: {
        get: (path: string) => (path === 'server.cache' ? { defaultProvider: 'nope' } : undefined),
      },
    };

    const manager = createCacheManager({ strapi, registry });

    await expect(manager.get('a', 'b')).rejects.toThrow('Unknown cache provider "nope"');
  });

  it('passes expiresAt to provider on set', async () => {
    const { manager } = build({});
    const exp = new Date('2035-01-01');
    await manager.set('n', 'k', 'v', { expiresAt: exp });

    expect(memory.set).toHaveBeenCalledWith('n', 'k', 'v', { expiresAt: exp });
  });

  it('passes provider-specific options from config to factory once', async () => {
    const factory = jest.fn(() => memory);
    const registry = createCacheProviderRegistry();
    registry.register('memory', factory);

    const strapi = {
      db: {} as any,
      config: {
        get: (path: string) =>
          path === 'server.cache'
            ? { defaultProvider: 'memory', providers: { memory: { foo: 'bar' } } }
            : undefined,
      },
    };

    const manager = createCacheManager({ strapi, registry });
    await manager.get('x', 'y');

    expect(factory).toHaveBeenCalledWith({ strapi, options: { foo: 'bar' } });
  });
});
