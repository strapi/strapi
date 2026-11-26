import path from 'node:path';

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
  databaseFromEnv,
  runInServer,
  scaffoldContentType,
  scaffoldServerScript,
  stopAllServers,
} from '@strapi/tests-shared';

import { setupApp, type TestApp } from '../../helpers';

const isPostgres = databaseFromEnv().client === 'postgres';
const describeOnPostgres = describe.skipIf(!isPostgres);

const ITEM_UID = 'api::timeout-item.timeout-item';
const QUERY_TIMEOUT = 300;
// Long enough that a query only finishes early if it really was cancelled
const SLEEP_SECONDS = 5;

describeOnPostgres('Database settings.queryTimeout', () => {
  let ctx: TestApp;

  const run = <T = unknown>(action: string, args?: Record<string, unknown>) =>
    runInServer<T>(ctx.server, 'query-timeout', action, args);

  const runningSleeps = () => run<number>('runningSleeps');
  const poolUsed = () => run<number>('poolUsed');

  beforeAll(async () => {
    ctx = await setupApp({
      name: 'db-query-timeout',
      scaffold(app) {
        scaffoldContentType(app, {
          displayName: 'timeout-item',
          singularName: 'timeout-item',
          pluralName: 'timeout-items',
          attributes: {
            name: { type: 'string' },
          },
        });
        scaffoldServerScript(app, path.join(__dirname, 'server/query-timeout.js'));
      },
      seed: { entries: [{ uid: ITEM_UID, data: { name: 'only row' } }] },
    });

    await run('setQueryTimeout', { queryTimeout: QUERY_TIMEOUT });
  });

  afterAll(stopAllServers);

  test('cancels a query builder query on the database once the timeout elapses', async () => {
    const startedAt = Date.now();

    await expect(run('sleepingQuery')).rejects.toThrow(/query timeout/i);

    expect(Date.now() - startedAt).toBeLessThan(SLEEP_SECONDS * 1000);
    expect(await runningSleeps()).toBe(0);
    expect(await poolUsed()).toBe(0);
  });

  test('cancels the query inside a transaction and releases its connection', async () => {
    const startedAt = Date.now();

    await expect(run('sleepingQueryInTransaction')).rejects.toThrow(/query timeout/i);

    expect(Date.now() - startedAt).toBeLessThan(SLEEP_SECONDS * 1000);
    expect(await runningSleeps()).toBe(0);
    expect(await poolUsed()).toBe(0);

    // The pool is still usable afterwards
    expect(await run('countItems')).toBe(1);
  });

  test('does not apply to queries issued directly on the knex connection', async () => {
    // Schema sync and migrations go through the connection directly, and must not be cut short
    const sleepSeconds = (QUERY_TIMEOUT * 2) / 1000;

    await expect(run('rawSleep', { seconds: sleepSeconds })).resolves.toBeDefined();
  });
});
