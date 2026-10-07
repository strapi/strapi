import os from 'node:os';
import dotenv from 'dotenv';
import knex from 'knex';
import type { Core } from '@strapi/types';
import { Database } from '@strapi/database';

import { createStrapiInstance } from 'api-tests/strapi';
import { createContentAPIRequest } from 'api-tests/request';
import { createTestBuilder } from 'api-tests/builder';

// Read the test app's .env now: the refused-connection test is skipped on SQLite at definition time
dotenv.config({ path: process.env.ENV_PATH });

const ITEM_UID = 'api::pool-item.pool-item';
const DOCS_URL = 'https://docs.strapi.io/cms/configurations/database#connection-pool-timeouts';
const ACQUIRE_TIMEOUT_MESSAGE =
  'Knex: Timeout acquiring a connection. The pool is probably full. Are you missing a .transacting(trx) call?';
const BLOCK_PREFIX = '[database] connection pool timeout';
const isSqlite = process.env.DATABASE_CLIENT === 'sqlite';

const itemModel = {
  kind: 'collectionType',
  displayName: 'pool-item',
  singularName: 'pool-item',
  pluralName: 'pool-items',
  draftAndPublish: false,
  attributes: {
    name: { type: 'string' },
  },
};

const createBarrier = (parties: number) => {
  let arrived = 0;
  let open: () => void = () => {};
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });

  return async () => {
    arrived += 1;
    if (arrived >= parties) {
      open();
    }
    await opened;
  };
};

async function rawQueryOutsideTransaction(strapi: Core.Strapi) {
  const rows = await strapi.db.connection('strapi_core_store_settings').select('id').limit(1);
  return rows;
}

// Privileged and never bound in a test environment, so connecting to it is refused
const REFUSED_PORT = 1;

describe('Pool timeout diagnostics', () => {
  const builder = createTestBuilder();
  let strapi: Core.Strapi;
  let rq: any;
  let barrier: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    await builder.addContentType(itemModel).build();

    strapi = await createStrapiInstance({
      register: ({ strapi: s }: { strapi: Core.Strapi }) => {
        s.config.set('database.connection.acquireConnectionTimeout', 1500);
      },
      bootstrap: ({ strapi: s }: { strapi: Core.Strapi }) => {
        s.db.lifecycles.subscribe({
          models: [ITEM_UID],
          async beforeCreate() {
            if (barrier) {
              // Wait until every request holds its transaction, then query outside it
              await barrier();
              await rawQueryOutsideTransaction(s);
            }
          },
        });
      },
    });

    rq = await createContentAPIRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  afterEach(() => {
    barrier = undefined;
    jest.restoreAllMocks();
  });

  test('a lifecycle query outside its transaction ends in a generic 500 and a described timeout', async () => {
    const errorSpy = jest.spyOn(strapi.log, 'error');
    const warnSpy = jest.spyOn(strapi.log, 'warn');
    const { max } = (strapi.db.connection.client as any).pool;
    barrier = createBarrier(max);

    const responses = await Promise.all(
      Array.from({ length: max }, (_, index) =>
        rq({ method: 'POST', url: '/pool-items', body: { data: { name: `item ${index}` } } })
      )
    );

    for (const res of responses) {
      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({
        data: null,
        error: { status: 500, name: 'InternalServerError', message: 'Internal Server Error' },
      });
    }

    const timeouts = errorSpy.mock.calls
      .map(([error]) => error as any)
      .filter((error) => error?.name === 'KnexTimeoutError');
    expect(timeouts).toHaveLength(max);

    const [first] = timeouts;
    expect(first).toBeInstanceOf(knex.KnexTimeoutError);
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

    const blocks = warnSpy.mock.calls
      .map(([message]) => String(message))
      .filter((message) => message.startsWith(BLOCK_PREFIX));
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toContain(`  - connections: ${max} in use, 0 free, max ${max}`);
    expect(blocks[0]).not.toContain('select');
  });

  (isSqlite ? test.skip : test)('names the refused connection behind the timeouts', async () => {
    const base = strapi.config.get('database.connection') as any;
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    const db = new Database({
      connection: {
        ...base,
        connection: { ...base.connection, host: '127.0.0.1', port: REFUSED_PORT },
        pool: { min: 0, max: 2 },
        acquireConnectionTimeout: 1500,
      },
      settings: { migrations: { dir: os.tmpdir() } },
      logger,
    });

    try {
      // With propagateCreateError (the default) each failed attempt rejects one caller directly;
      // only the callers beyond that wait and time out, so it takes dozens of callers
      const results = await Promise.allSettled(
        Array.from({ length: 50 }, () => db.connection.raw('select 1'))
      );
      const timeouts = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map((result) => result.reason)
        .filter((reason) => reason?.name === 'KnexTimeoutError');

      expect(timeouts.length).toBeGreaterThan(0);
      expect(timeouts[0].details.pool.used).toBe(0);
      expect(timeouts[0].details.poolReason).toContain('ECONNREFUSED');

      const blocks = logger.warn.mock.calls
        .map(([message]) => String(message))
        .filter((message) => message.startsWith(BLOCK_PREFIX));
      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toContain('  - reason reported by the pool: connect ECONNREFUSED');
    } finally {
      await db.destroy();
    }
  });
});
