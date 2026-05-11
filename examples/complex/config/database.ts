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
  };

  if (!connections[client]) {
    throw new Error(`Unsupported DATABASE_CLIENT: ${client}. Use "postgres" or "mysql".`);
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
      slowQueryMs: env.int('DATABASE_PERF_SLOW_MS', 50),
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
