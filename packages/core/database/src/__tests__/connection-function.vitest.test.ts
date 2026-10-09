import { describe, it, expect, afterEach } from 'vitest';

import { Database } from '../index';

const silentLogger = { info() {}, warn() {}, error() {}, debug() {} };

const connectionSettings = {
  host: '127.0.0.1',
  port: 5432,
  database: 'strapi',
  user: 'strapi',
  password: 'strapi',
};

/**
 * The knex client and its tarn pool are real; only the driver-level connections are fakes,
 * so pool accounting can be asserted without a running Postgres server.
 */
const createPostgresDatabase = () => {
  const db = new Database({
    connection: {
      client: 'postgres',
      connection: async () => ({ ...connectionSettings }),
      pool: { min: 0, max: 2 },
    },
    settings: { migrations: { dir: 'migrations' } },
    logger: silentLogger,
  });

  db.connection.client.acquireRawConnection = async () => ({});
  db.connection.client.destroyRawConnection = async () => {};

  return db;
};

describe('Database#init with a connection function', () => {
  let db: Database | undefined;

  afterEach(async () => {
    await db?.destroy();
    db = undefined;
  });

  it('resolves the connection function so connectionSettings is available after init', async () => {
    db = createPostgresDatabase();

    await db.init({ models: [] });

    expect(db.connection.client.connectionSettings).toMatchObject(connectionSettings);
  });

  it('returns the connection it opens to the pool', async () => {
    db = createPostgresDatabase();

    await db.init({ models: [] });

    expect(db.connection.client.pool.numUsed()).toBe(0);
  });

  it('can be destroyed after init', async () => {
    // tarn's pool.destroy() waits for every borrowed connection to be released
    const created = createPostgresDatabase();

    await created.init({ models: [] });

    await expect(created.destroy()).resolves.toBeUndefined();
  });
});
