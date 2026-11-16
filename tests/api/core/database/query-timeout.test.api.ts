import dotenv from 'dotenv';
import type { Core } from '@strapi/types';

import { createStrapiInstance } from 'api-tests/strapi';
import { createTestBuilder } from 'api-tests/builder';

// Read the test app's .env now: the suite only runs on postgres, decided at definition time
dotenv.config({ path: process.env.ENV_PATH });

const isPostgres = process.env.DATABASE_CLIENT === 'postgres';
const describeOnPostgres = isPostgres ? describe : describe.skip;

const ITEM_UID = 'api::timeout-item.timeout-item';
const QUERY_TIMEOUT = 300;
// Long enough that a query only finishes early if it really was cancelled
const SLEEP_SECONDS = 5;

const itemModel = {
  kind: 'collectionType',
  displayName: 'timeout-item',
  singularName: 'timeout-item',
  pluralName: 'timeout-items',
  draftAndPublish: false,
  attributes: {
    name: { type: 'string' },
  },
};

describeOnPostgres('Database settings.queryTimeout', () => {
  const builder = createTestBuilder();
  let strapi: Core.Strapi;

  const pool = () => (strapi.db.connection.client as any).pool;

  // A query builder query that sleeps on the database side, so execute() applies the timeout
  const sleepingQuery = () =>
    strapi.db
      .queryBuilder(ITEM_UID)
      .select(['id', strapi.db.connection.raw(`pg_sleep(${SLEEP_SECONDS})`)])
      .execute({ mapResults: false });

  const runningSleeps = async () => {
    const rows = await strapi.db.connection
      .select('pid')
      .from('pg_stat_activity')
      .where('query', 'like', '%pg_sleep(%')
      .andWhere('state', 'active')
      .andWhereRaw('pid <> pg_backend_pid()');

    return rows.length;
  };

  beforeAll(async () => {
    await builder
      .addContentType(itemModel)
      .addFixtures(itemModel.singularName, [{ name: 'only row' }])
      .build();

    strapi = await createStrapiInstance();
    // Set after boot: the setting is read per query, and this keeps boot itself unaffected
    strapi.db.config.settings.queryTimeout = QUERY_TIMEOUT;
  });

  afterAll(async () => {
    strapi.db.config.settings.queryTimeout = undefined;
    await strapi.destroy();
    await builder.cleanup();
  });

  test('cancels a query builder query on the database once the timeout elapses', async () => {
    const startedAt = Date.now();

    await expect(sleepingQuery()).rejects.toThrow(/query timeout/i);

    expect(Date.now() - startedAt).toBeLessThan(SLEEP_SECONDS * 1000);
    expect(await runningSleeps()).toBe(0);
    expect(pool().numUsed()).toBe(0);
  });

  test('cancels the query inside a transaction and releases its connection', async () => {
    const startedAt = Date.now();

    await expect(strapi.db.transaction(() => sleepingQuery())).rejects.toThrow(/query timeout/i);

    expect(Date.now() - startedAt).toBeLessThan(SLEEP_SECONDS * 1000);
    expect(await runningSleeps()).toBe(0);
    expect(pool().numUsed()).toBe(0);

    // The pool is still usable afterwards
    const rows = await strapi.db.queryBuilder(ITEM_UID).select('*').execute();
    expect(rows).toHaveLength(1);
  });

  test('does not apply to queries issued directly on the knex connection', async () => {
    // Schema sync and migrations go through the connection directly, and must not be cut short
    const sleepSeconds = (QUERY_TIMEOUT * 2) / 1000;

    await expect(
      strapi.db.connection.raw(`select pg_sleep(${sleepSeconds})`)
    ).resolves.toBeDefined();
  });
});
