import type { Modules } from '@strapi/types';
import { createCacheProviderRegistry } from '../caching/create-cache-provider-registry';

type CacheProvider = Modules.Cache.CacheProvider;

const noopProvider = (): CacheProvider => ({
  async get() {
    return null;
  },
  async set() {
    return undefined;
  },
  async delete() {
    return undefined;
  },
});

describe('createCacheProviderRegistry', () => {
  it('registers a factory and exposes it via get and has', () => {
    const registry = createCacheProviderRegistry();
    const factory = jest.fn(noopProvider);

    registry.register('memory', factory);

    expect(registry.has('memory')).toBe(true);
    expect(registry.get('memory')).toBe(factory);
    expect(registry.getRegisteredNames()).toEqual(['memory']);
  });

  it('throws when registering the same name twice', () => {
    const registry = createCacheProviderRegistry();
    registry.register('memory', noopProvider);

    expect(() => registry.register('memory', noopProvider)).toThrow(
      'Cache provider "memory" is already registered'
    );
  });

  it('invokes factory with strapi context when used by consumer', () => {
    const registry = createCacheProviderRegistry();
    const factory = jest.fn(noopProvider);
    registry.register('test', factory);

    const strapi = { db: {} as any, config: { get: jest.fn() } };
    const provider = factory({ strapi, options: {} });

    expect(factory).toHaveBeenCalledWith({ strapi, options: {} });
    expect(provider.get).toBeDefined();
  });

  it('returns undefined for unknown provider', () => {
    const registry = createCacheProviderRegistry();
    expect(registry.get('unknown')).toBeUndefined();
    expect(registry.has('unknown')).toBe(false);
  });
});
