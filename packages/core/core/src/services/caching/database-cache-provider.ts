import type { Modules } from '@strapi/types';

import { cacheEntryModel } from './cache-entry-model';

type CacheEntry = Modules.Cache.CacheEntry;
type CacheProvider = Modules.Cache.CacheProvider;
type CacheProviderStrapiContext = Modules.Cache.CacheProviderStrapiContext;

const UID = cacheEntryModel.uid as 'strapi::cache-entry';

const assertKey = (namespace: string, key: string) => {
  if (typeof namespace !== 'string' || namespace.length === 0) {
    throw new Error('Cache namespace must be a non-empty string');
  }
  if (typeof key !== 'string' || key.length === 0) {
    throw new Error('Cache key must be a non-empty string');
  }
};

const toDate = (v: unknown): Date => {
  if (v instanceof Date) {
    return v;
  }
  if (typeof v === 'string' || typeof v === 'number') {
    return new Date(v);
  }
  return new Date(String(v));
};

export const createDatabaseCacheProvider = (strapi: CacheProviderStrapiContext): CacheProvider => {
  const query = () => strapi.db.query(UID);

  return {
    async get(namespace: string, key: string): Promise<CacheEntry | null> {
      assertKey(namespace, key);
      const row = await query().findOne({
        where: { namespace, key },
      });

      if (!row) {
        return null;
      }

      const expiresAt = row.expiresAt ? toDate(row.expiresAt) : null;
      if (expiresAt && expiresAt.getTime() <= Date.now()) {
        await query().delete({ where: { id: row.id } });
        return null;
      }

      return {
        value: row.value,
        createdAt: toDate(row.createdAt),
        updatedAt: toDate(row.updatedAt),
        expiresAt,
      };
    },

    async set(
      namespace: string,
      key: string,
      value: unknown,
      options?: { expiresAt?: Date | null }
    ): Promise<void> {
      assertKey(namespace, key);
      const now = new Date();
      const expiresAt = options?.expiresAt === undefined ? null : options.expiresAt;

      const existing = await query().findOne({
        where: { namespace, key },
      });

      if (existing) {
        await query().update({
          where: { id: existing.id },
          data: {
            value,
            expiresAt,
            updatedAt: now,
          },
        });
      } else {
        await query().create({
          data: {
            namespace,
            key,
            value,
            expiresAt,
            createdAt: now,
            updatedAt: now,
          },
        });
      }
    },

    async delete(namespace: string, key: string): Promise<void> {
      assertKey(namespace, key);
      const existing = await query().findOne({
        where: { namespace, key },
      });
      if (existing) {
        await query().delete({ where: { id: existing.id } });
      }
    },
  };
};

export { cacheEntryModel };
