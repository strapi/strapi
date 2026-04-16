import type { Core, Modules } from '@strapi/types';
import Redis, { type RedisOptions } from 'ioredis';

import { createRedisCacheProvider } from './redis-cache-provider';
import { resolveRedisConnection } from './resolve-redis-connection';

const clientsByStrapi = new WeakMap<Core.Strapi, Set<InstanceType<typeof Redis>>>();

const getClientSet = (strapi: Core.Strapi): Set<Redis> => {
  let set = clientsByStrapi.get(strapi);
  if (!set) {
    set = new Set();
    clientsByStrapi.set(strapi, set);
  }
  return set;
};

export const register = ({ strapi }: { strapi: Core.Strapi }) => {
  const clientSet = getClientSet(strapi);

  strapi
    .get('cacheProviderRegistry')
    .register('redis', ({ options }: Parameters<Modules.Cache.CacheProviderFactory>[0]) => {
      const opts = (options ?? {}) as Record<string, unknown>;
      const connection = resolveRedisConnection(opts);
      const client =
        typeof connection === 'string'
          ? new Redis(connection)
          : new Redis(connection as RedisOptions);
      clientSet.add(client);

      const keyPrefix =
        typeof opts.keyPrefix === 'string' && opts.keyPrefix.length > 0
          ? opts.keyPrefix
          : undefined;

      return createRedisCacheProvider(client, { keyPrefix });
    });
};

export const destroy = async ({ strapi }: { strapi: Core.Strapi }) => {
  const set = clientsByStrapi.get(strapi);
  if (!set) {
    return;
  }

  await Promise.all(
    [...set].map((client) => {
      return client.quit();
    })
  );
  set.clear();
};
