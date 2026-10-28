/**
 * Normalizes `server.cache.providers.redis.connection` for ioredis.
 * Accepts a Redis URL string, `{ url }`, or a plain ioredis options object.
 */
export const resolveRedisConnection = (
  options: Record<string, unknown>
): string | Record<string, unknown> => {
  const conn = options.connection;

  if (typeof conn === 'string') {
    return conn;
  }

  if (conn && typeof conn === 'object' && !Array.isArray(conn)) {
    const o = conn as Record<string, unknown>;
    if (typeof o.url === 'string') {
      return o.url;
    }
    return o;
  }

  throw new Error(
    'Redis cache provider requires server.cache.providers.redis.connection (URL string or options object).'
  );
};
