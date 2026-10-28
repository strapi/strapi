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

const UNIQUE_CONSTRAINT_ERROR_CODES = new Set([
  '23505',
  'ER_DUP_ENTRY',
  'SQLITE_CONSTRAINT_UNIQUE',
]);

/**
 * Detects vendor-specific unique-constraint violations so a losing `create()` in the
 * `set()` race below (two requests both miss the `findOne` and both try to insert the
 * same `(namespace, key)`) can be handled instead of failing the caller's request.
 */
const isUniqueConstraintError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = (error as { code?: unknown; originalError?: { code?: unknown } }).code;
  if (typeof code === 'string' && UNIQUE_CONSTRAINT_ERROR_CODES.has(code)) {
    return true;
  }

  const message = (error as { message?: unknown }).message;
  if (typeof message === 'string') {
    return (
      message.includes('UNIQUE constraint failed') ||
      message.includes('duplicate key value violates unique constraint') ||
      message.includes('Duplicate entry')
    );
  }

  return false;
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
        return;
      }

      try {
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
      } catch (error) {
        if (!isUniqueConstraintError(error)) {
          throw error;
        }

        // Lost a race with a concurrent set() for the same (namespace, key): the unique
        // index on (namespace, key) rejected our insert because another request's row
        // already won. Apply this write as an update on the winning row instead of
        // failing the caller's request; last write wins, same as the non-racing path
        // above. If that row already holds the value we were about to write (e.g. a
        // retried call), this update is a no-op in effect.
        await query().update({
          where: { namespace, key },
          data: {
            value,
            expiresAt,
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
