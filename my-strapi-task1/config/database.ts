import path from 'node:path';

function sslOptions(env) {
  if (!env.bool('DATABASE_SSL', false)) return undefined;

  return {
    key: env('DATABASE_SSL_KEY', undefined),
    cert: env('DATABASE_SSL_CERT', undefined),
    ca: env('DATABASE_SSL_CA', undefined),
    capath: env('DATABASE_SSL_CAPATH', undefined),
    cipher: env('DATABASE_SSL_CIPHER', undefined),
    rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
  };
}

function poolConfig(env) {
  return { min: env.int('DATABASE_POOL_MIN', 2), max: env.int('DATABASE_POOL_MAX', 10) };
}

export default function database({ env }) {
  const client = env('DATABASE_CLIENT', 'sqlite');

  const connections = {
    mysql: {
      connection: {
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 3306),
        database: env('DATABASE_NAME', 'strapi'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        ssl: sslOptions(env),
      },
      pool: poolConfig(env),
    },
    postgres: {
      connection: {
        connectionString: env('DATABASE_URL'),
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 5432),
        database: env('DATABASE_NAME', 'strapi'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        ssl: sslOptions(env),
        schema: env('DATABASE_SCHEMA', 'public'),
      },
      pool: poolConfig(env),
    },
    sqlite: {
      connection: {
        filename: path.join(__dirname, '..', '..', env('DATABASE_FILENAME', '.tmp/data.db')),
      },
      useNullAsDefault: true,
    },
  };

  return {
    connection: {
      client,
      ...connections[client],
      acquireConnectionTimeout: env.int('DATABASE_CONNECTION_TIMEOUT', 60000),
    },
  };
}
