import type { Modules } from '@strapi/types';
import type Redis from 'ioredis';

type CacheEntry = Modules.Cache.CacheEntry;
type CacheProvider = Modules.Cache.CacheProvider;

const SEP = '\u0000';

export const DEFAULT_KEY_PREFIX = 'strapi:cache:';

const assertKey = (namespace: string, key: string) => {
  if (typeof namespace !== 'string' || namespace.length === 0) {
    throw new Error('Cache namespace must be a non-empty string');
  }
  if (typeof key !== 'string' || key.length === 0) {
    throw new Error('Cache key must be a non-empty string');
  }
};

const compositeKey = (namespace: string, key: string) => `${namespace}${SEP}${key}`;

type StoredPayload = {
  value: unknown;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
};

const parseDates = (
  row: StoredPayload
): Omit<StoredPayload, 'createdAt' | 'updatedAt' | 'expiresAt'> & {
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
} => ({
  value: row.value,
  createdAt: new Date(row.createdAt),
  updatedAt: new Date(row.updatedAt),
  expiresAt: row.expiresAt ? new Date(row.expiresAt) : null,
});

export const createRedisCacheProvider = (
  redis: Redis,
  options?: { keyPrefix?: string }
): CacheProvider => {
  const keyPrefix =
    typeof options?.keyPrefix === 'string' && options.keyPrefix.length > 0
      ? options.keyPrefix
      : DEFAULT_KEY_PREFIX;

  const redisKeyFor = (namespace: string, key: string) =>
    `${keyPrefix}${compositeKey(namespace, key)}`;

  return {
    async get(namespace: string, key: string): Promise<CacheEntry | null> {
      assertKey(namespace, key);
      const rkey = redisKeyFor(namespace, key);
      const raw = await redis.get(rkey);
      if (raw === null) {
        return null;
      }

      let row: StoredPayload;
      try {
        row = JSON.parse(raw) as StoredPayload;
      } catch {
        await redis.del(rkey);
        return null;
      }

      const parsed = parseDates(row);

      if (parsed.expiresAt && parsed.expiresAt.getTime() <= Date.now()) {
        await redis.del(rkey);
        return null;
      }

      return {
        value: parsed.value,
        createdAt: parsed.createdAt,
        updatedAt: parsed.updatedAt,
        expiresAt: parsed.expiresAt,
      };
    },

    async set(
      namespace: string,
      key: string,
      value: unknown,
      opts?: { expiresAt?: Date | null }
    ): Promise<void> {
      assertKey(namespace, key);
      const rkey = redisKeyFor(namespace, key);
      const now = new Date();
      const rawExisting = await redis.get(rkey);

      let createdAt = now;
      if (rawExisting) {
        try {
          const existing = JSON.parse(rawExisting) as StoredPayload;
          createdAt = new Date(existing.createdAt);
        } catch {
          createdAt = now;
        }
      }

      const expiresAt = opts?.expiresAt === undefined ? null : opts.expiresAt;

      const payload: StoredPayload = {
        value,
        createdAt: createdAt.toISOString(),
        updatedAt: now.toISOString(),
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
      };

      await redis.set(rkey, JSON.stringify(payload));

      if (expiresAt) {
        await redis.pexpireat(rkey, expiresAt.getTime());
      } else {
        await redis.persist(rkey);
      }
    },

    async delete(namespace: string, key: string): Promise<void> {
      assertKey(namespace, key);
      await redis.del(redisKeyFor(namespace, key));
    },
  };
};
