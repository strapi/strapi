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

export const createMemoryCacheProvider = (): CacheProvider => {
  const store = new Map<string, Stored>();

  return {
    async get(namespace: string, key: string): Promise<CacheEntry | null> {
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
    },

    async set(
      namespace: string,
      key: string,
      value: unknown,
      options?: { expiresAt?: Date | null }
    ): Promise<void> {
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
    },

    async delete(namespace: string, key: string): Promise<void> {
      assertKey(namespace, key);
      store.delete(compositeKey(namespace, key));
    },
  };
};
