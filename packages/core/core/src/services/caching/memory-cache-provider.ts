import type { Modules } from '@strapi/types';

type CacheEntry = Modules.Cache.CacheEntry;
type CacheProvider = Modules.Cache.CacheProvider;

const SEP = '\u0000';

const assertKey = (namespace: string, key: string) => {
  if (typeof namespace !== 'string' || namespace.length === 0) {
    throw new Error('Cache namespace must be a non-empty string');
  }
  if (typeof key !== 'string' || key.length === 0) {
    throw new Error('Cache key must be a non-empty string');
  }
};

const compositeKey = (namespace: string, key: string) => `${namespace}${SEP}${key}`;

type Stored = {
  value: unknown;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
};

/**
 * Single process-wide store backing the registered `memory` cache provider and
 * {@link memoryCacheSync} so hot synchronous paths can share the same cache as
 * `strapi.cacheManager` without awaiting.
 */
export const sharedMemoryCacheStore = new Map<string, Stored>();

const getFromStore = (
  store: Map<string, Stored>,
  namespace: string,
  key: string
): CacheEntry | null => {
  assertKey(namespace, key);
  const ck = compositeKey(namespace, key);
  const row = store.get(ck);
  if (!row) {
    return null;
  }
  if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
    store.delete(ck);
    return null;
  }
  return {
    value: row.value,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    expiresAt: row.expiresAt,
  };
};

const setInStore = (
  store: Map<string, Stored>,
  namespace: string,
  key: string,
  value: unknown,
  options?: { expiresAt?: Date | null }
): void => {
  assertKey(namespace, key);
  const ck = compositeKey(namespace, key);
  const now = new Date();
  const existing = store.get(ck);
  const expiresAt = options?.expiresAt === undefined ? null : options.expiresAt;

  store.set(ck, {
    value,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    expiresAt,
  });
};

const deleteFromStore = (store: Map<string, Stored>, namespace: string, key: string): void => {
  assertKey(namespace, key);
  store.delete(compositeKey(namespace, key));
};

/**
 * Synchronous access to the same backing store as the `memory` cache provider.
 * Use only where `await strapi.cacheManager` is not possible; always target
 * process-local data that must not use the configured default provider when it
 * is database/redis.
 */
export const memoryCacheSync = {
  get(namespace: string, key: string): CacheEntry | null {
    return getFromStore(sharedMemoryCacheStore, namespace, key);
  },

  set(namespace: string, key: string, value: unknown, options?: { expiresAt?: Date | null }): void {
    setInStore(sharedMemoryCacheStore, namespace, key, value, options);
  },

  delete(namespace: string, key: string): void {
    deleteFromStore(sharedMemoryCacheStore, namespace, key);
  },
};

export const createMemoryCacheProvider = (
  store: Map<string, Stored> = sharedMemoryCacheStore
): CacheProvider => {
  return {
    async get(namespace: string, key: string): Promise<CacheEntry | null> {
      return getFromStore(store, namespace, key);
    },

    async set(
      namespace: string,
      key: string,
      value: unknown,
      options?: { expiresAt?: Date | null }
    ): Promise<void> {
      setInStore(store, namespace, key, value, options);
    },

    async delete(namespace: string, key: string): Promise<void> {
      deleteFromStore(store, namespace, key);
    },
  };
};
