import path from 'node:path';

import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import {
  databaseFromEnv,
  runInServer,
  scaffoldConfig,
  scaffoldContentType,
  scaffoldDependency,
  scaffoldServerScript,
  stopAllServers,
} from '@strapi/tests-shared';

import {
  createClient,
  createContentAPIClient,
  setupApp,
  SUPER_ADMIN,
  type Client,
  type TestApp,
} from '../../helpers';

const DOCS_URL = 'https://docs.strapi.io/cms/configurations/database#connection-pool-timeouts';
const ACQUIRE_TIMEOUT_MESSAGE =
  'Knex: Timeout acquiring a connection. The pool is probably full. Are you missing a .transacting(trx) call?';
const BLOCK_PREFIX = '[database] connection pool timeout';
const isSqlite = databaseFromEnv().client === 'sqlite';

// __typename keeps the selection valid with and without the GraphQL v4 compatibility response shape
const CREATE_POOL_ITEM = /* GraphQL */ `
  mutation createPoolItem($data: PoolItemInput!) {
    createPoolItem(data: $data) {
      __typename
    }
  }
`;

/** A logged error, as server/pool-timeout-diagnostics.js serializes it. */
interface LoggedError {
  name: string;
  message: string;
  details: any;
  stack: string;
  isKnexTimeoutError: boolean;
}

interface Logs {
  error: Array<LoggedError | string>;
  warn: string[];
}

describe('Pool timeout diagnostics', () => {
  let ctx: TestApp;
  let rq: Client;
  let rqGraphql: Client;

  const run = <T = unknown>(action: string, args?: Record<string, unknown>) =>
    runInServer<T>(ctx.server, 'pool-timeout-diagnostics', action, args);

  const timeoutsIn = (logs: Logs) =>
    logs.error.filter(
      (error): error is LoggedError =>
        typeof error === 'object' && error?.name === 'KnexTimeoutError'
    );

  beforeAll(async () => {
    ctx = await setupApp({
      name: 'db-pool-timeout',
      scaffold(app) {
        scaffoldDependency(app, '@strapi/plugin-graphql');
        scaffoldContentType(app, {
          displayName: 'pool-item',
          singularName: 'pool-item',
          pluralName: 'pool-items',
          attributes: {
            name: { type: 'string' },
          },
        });
        // Read when Strapi creates its database, before any plugin's register
        scaffoldConfig(app, 'database', { connection: { acquireConnectionTimeout: 1500 } });
        // Its `bootstrap` subscribes the lifecycle
        scaffoldServerScript(app, path.join(__dirname, 'server/pool-timeout-diagnostics.js'));
      },
      seed: { adminUsers: [SUPER_ADMIN], apiTokens: [{ name: 'full', type: 'full-access' }] },
    });

    const token = ctx.seeded.apiTokens[0].accessKey;
    rq = createContentAPIClient(ctx.server, { token });
    // The GraphQL endpoint sits at /graphql, outside the /api prefix of the content API client
    rqGraphql = createClient(ctx.server, { token });
  });

  afterAll(stopAllServers);

  afterEach(async () => {
    await run('disarm');
    // Restores the logger if a test failed before reading its logs
    await run('capturedLogs');
  });

  test('a lifecycle query outside its transaction ends in a generic 500 and a described timeout', async () => {
    await run('captureLogs');
    const max = await run<number>('poolMax');
    await run('arm', { parties: max });

    const responses = await Promise.all(
      Array.from({ length: max }, (_, index) =>
        rq.post('/pool-items', { body: { data: { name: `item ${index}` } } })
      )
    );

    for (const res of responses) {
      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        data: null,
        error: { status: 500, name: 'InternalServerError', message: 'Internal Server Error' },
      });
    }

    const logs = await run<Logs>('capturedLogs');
    const timeouts = timeoutsIn(logs);
    expect(timeouts).toHaveLength(max);

    const [first] = timeouts;
    expect(first.isKnexTimeoutError).toBe(true);
    expect(first.message).toBe(`${ACQUIRE_TIMEOUT_MESSAGE} See ${DOCS_URL}.`);
    expect(first.details).toMatchObject({
      code: 'DB_POOL_ACQUIRE_TIMEOUT',
      acquireTimeoutMs: 1500,
      phase: 'runtime',
      pool: { used: max, max },
      poolReason: 'operation timed out for an unknown reason',
    });
    expect(first.details.waitedMs).toBeGreaterThanOrEqual(1400);
    expect(first.stack).toContain('rawQueryOutsideTransaction');

    const blocks = logs.warn.filter((message) => message.startsWith(BLOCK_PREFIX));
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toContain(`  - connections: ${max} in use, 0 free, max ${max}`);
    expect(blocks[0]).not.toContain('select');
  });

  test('the same pool timeout reaches GraphQL clients as a generic error without the internal details', async () => {
    await run('captureLogs');
    const max = await run<number>('poolMax');
    const hostname = await run<string>('hostname');
    await run('arm', { parties: max });

    const responses = await Promise.all(
      Array.from({ length: max }, (_, index) =>
        rqGraphql.post('/graphql', {
          body: { query: CREATE_POOL_ITEM, variables: { data: { name: `item ${index}` } } },
        })
      )
    );

    for (const res of responses) {
      expect(res.body.errors).toHaveLength(1);

      const [error] = res.body.errors;
      expect(error.message).toBe('Internal Server Error');
      expect(error.path).toEqual(['createPoolItem']);
      expect(error.locations).toEqual([
        expect.objectContaining({ line: expect.any(Number), column: expect.any(Number) }),
      ]);
      expect(error.extensions.code).toBe('INTERNAL_SERVER_ERROR');
      expect(error.extensions.error).toEqual({
        name: 'InternalServerError',
        message: 'Internal Server Error',
      });

      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toContain('DB_POOL_ACQUIRE_TIMEOUT');
      expect(serialized).not.toContain('Knex');
      expect(serialized).not.toContain(hostname);
    }

    // The full error is still logged server side
    const timeouts = timeoutsIn(await run<Logs>('capturedLogs'));
    expect(timeouts).toHaveLength(max);
    expect(timeouts[0].details).toMatchObject({
      code: 'DB_POOL_ACQUIRE_TIMEOUT',
      phase: 'runtime',
    });
  });

  test.skipIf(isSqlite)('names the refused connection behind the timeouts', async () => {
    const { timeouts, warnings } = await run<{ timeouts: LoggedError[]; warnings: string[] }>(
      'refusedConnection'
    );

    expect(timeouts.length).toBeGreaterThan(0);
    expect(timeouts[0].details.pool.used).toBe(0);
    expect(timeouts[0].details.poolReason).toContain('ECONNREFUSED');

    const blocks = warnings.filter((message) => message.startsWith(BLOCK_PREFIX));
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toContain('  - reason reported by the pool: connect ECONNREFUSED');
  });
});
