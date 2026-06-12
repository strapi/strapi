import path from 'path';

export default ({ env }) => {
  const client = env('DATABASE_CLIENT', 'postgres');

  const connections = {
    mysql: {
      connection: {
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 3306),
        database: env('DATABASE_NAME', 'strapi'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        ssl: env.bool('DATABASE_SSL', false) && {
          key: env('DATABASE_SSL_KEY', undefined),
          cert: env('DATABASE_SSL_CERT', undefined),
          ca: env('DATABASE_SSL_CA', undefined),
          capath: env('DATABASE_SSL_CAPATH', undefined),
          cipher: env('DATABASE_SSL_CIPHER', undefined),
          rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
        },
      },
      pool: { min: env.int('DATABASE_POOL_MIN', 2), max: env.int('DATABASE_POOL_MAX', 10) },
    },
    postgres: {
      connection: {
        connectionString: env('DATABASE_URL'),
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 5432),
        database: env('DATABASE_NAME', 'strapi'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        ssl: env.bool('DATABASE_SSL', false) && {
          key: env('DATABASE_SSL_KEY', undefined),
          cert: env('DATABASE_SSL_CERT', undefined),
          ca: env('DATABASE_SSL_CA', undefined),
          capath: env('DATABASE_SSL_CAPATH', undefined),
          cipher: env('DATABASE_SSL_CIPHER', undefined),
          rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
        },
        schema: env('DATABASE_SCHEMA', 'public'),
      },
      pool: { min: env.int('DATABASE_POOL_MIN', 2), max: env.int('DATABASE_POOL_MAX', 10) },
    },
    sqlite: {
      connection: {
        filename: env('DATABASE_FILENAME', '.tmp/data.db'),
      },
      useNullAsDefault: true,
    },
  };

  if (!connections[client]) {
    throw new Error(
      `Unsupported DATABASE_CLIENT: ${client}. Use "postgres", "mysql", or "sqlite".`
    );
  }

  return {
    connection: {
      client,
      ...connections[client],
      acquireConnectionTimeout: env.int('DATABASE_CONNECTION_TIMEOUT', 60000),
    },
    /**
     * Demo: SQL perf signals + hub bridge + JSON Lines artifact (see `config/server.ts` for request summaries).
     * Path is under the app root (`__dirname/../.tmp`) so it works with the admin Performance snapshot widget
     * and `yarn develop` from any working directory.
     */
    performance: {
      enabled: true,
      /**
       * Low on purpose: a *lower* threshold means *more* queries count as slow. On a fast local DB,
       * 50ms often never fires; use a few ms here so the demo artifact/widget actually shows `query.slow`.
       * Raise `DATABASE_PERF_SLOW_MS` (e.g. 100–500) when you want production-like rarity.
       */
      slowQueryMs: env.int('DATABASE_PERF_SLOW_MS', 5),
      sampleRate: Number.parseFloat(env('DATABASE_PERF_SAMPLE_RATE', '1')) || 1,
      captureSqlText: env.bool('DATABASE_PERF_CAPTURE_SQL', true),
      captureBindings: env.bool('DATABASE_PERF_CAPTURE_BINDINGS', false),
      output: 'both',
      artifactPath: path.join(__dirname, '..', '.tmp', 'performance-events.jsonl'),
      flushIntervalMs: env.int('DATABASE_PERF_ARTIFACT_FLUSH_MS', 3000),
      maxEvents: env.int('DATABASE_PERF_ARTIFACT_MAX_EVENTS', 500),
    },
  };
};
