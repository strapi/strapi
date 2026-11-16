import http from 'node:http';
import dotenv from 'dotenv';
import type { Core } from '@strapi/types';

import { createStrapiInstance } from 'api-tests/strapi';
import { createTestBuilder } from 'api-tests/builder';

// Reproduction for strapi/strapi#28646: a client disconnect must stop DB work of that request.
// Read the test app's .env now: the suite only runs on postgres, decided at definition time
dotenv.config({ path: process.env.ENV_PATH });

const isPostgres = process.env.DATABASE_CLIENT === 'postgres';
const describeOnPostgres = isPostgres ? describe : describe.skip;

const ITEM_UID = 'api::abort-item.abort-item';
// Long enough that a query only finishes early if it really was cancelled
const SLEEP_SECONDS = 8;
const POOL_MAX = 2;
// How long the client waits before hanging up
const DISCONNECT_AFTER_MS = 500;
// Budget for the database to notice the cancellation after the client left
const CANCEL_BUDGET_MS = 3000;

const itemModel = {
  kind: 'collectionType',
  displayName: 'abort-item',
  singularName: 'abort-item',
  pluralName: 'abort-items',
  draftAndPublish: false,
  attributes: {
    name: { type: 'string' },
  },
};

const createDeferred = <T = void>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const createdEvents: string[] = [];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Sends a request and destroys the socket `afterMs` later, before any response could end. */
const requestAndAbort = (
  {
    port,
    method = 'GET',
    path,
    body,
  }: { port: number; method?: string; path: string; body?: string },
  afterMs = DISCONNECT_AFTER_MS
) =>
  new Promise<void>((resolve) => {
    const request = http.request({
      method,
      port,
      path,
      headers: body ? { 'content-type': 'application/json' } : {},
    });
    request.on('error', () => {});
    request.on('close', () => resolve());
    request.end(body);
    setTimeout(() => request.destroy(), afterMs);
  });

const getJson = ({ port, path }: { port: number; path: string }) =>
  new Promise<{ statusCode: number | undefined; body: any }>((resolve, reject) => {
    http
      .get({ port, path }, (response) => {
        let raw = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => (raw += chunk));
        response.on('end', () => {
          try {
            resolve({ statusCode: response.statusCode, body: JSON.parse(raw) });
          } catch (error) {
            reject(error);
          }
        });
      })
      .on('error', reject);
  });

describeOnPostgres('Client disconnects cancel database work (#28646)', () => {
  const builder = createTestBuilder();
  let strapi: Core.Strapi;
  let port: number;
  let started: ReturnType<typeof createDeferred>;
  let handlerSettled: ReturnType<typeof createDeferred<string>>;
  const issuedSql: string[] = [];

  const pool = () => (strapi.db.connection.client as any).pool;

  const slowSelect = (seconds = SLEEP_SECONDS) =>
    strapi.db
      .queryBuilder(ITEM_UID)
      .select(['id', strapi.db.connection.raw(`pg_sleep(${seconds})`)])
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

  const waitUntil = async (predicate: () => Promise<boolean> | boolean, timeoutMs: number) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await predicate()) {
        return true;
      }
      await sleep(100);
    }
    return predicate();
  };

  beforeAll(async () => {
    await builder
      .addContentType(itemModel)
      .addFixtures(itemModel.singularName, [{ name: 'only row' }])
      .build();

    strapi = await createStrapiInstance({
      register: ({ strapi: s }: { strapi: Core.Strapi }) => {
        // A small pool, so abandoned queries are felt by the next request
        s.config.set('database.connection.pool', { min: 0, max: POOL_MAX });
        s.config.set('database.connection.acquireConnectionTimeout', 3000);
        // Opt-in setting
        s.config.set('database.settings.cancelQueriesOnClientDisconnect', true);
      },
      bootstrap: ({ strapi: s }: { strapi: Core.Strapi }) => {
        const query = () => s.db.queryBuilder(ITEM_UID);
        const slow = (seconds: number) =>
          query()
            .select(['id', s.db.connection.raw(`pg_sleep(${seconds})`)])
            .execute({ mapResults: false });

        s.server.routes({
          type: 'content-api',
          routes: [
            {
              // One slow select
              method: 'GET',
              path: '/abort-slow',
              handler: async (ctx: any) => {
                started.resolve();
                ctx.body = await slow(SLEEP_SECONDS);
              },
              config: { auth: false },
            },
            {
              // A slow select, then a second select issued even when the first one failed
              method: 'GET',
              path: '/abort-then-select',
              handler: async (ctx: any) => {
                started.resolve();
                try {
                  await slow(1.5);
                } catch {
                  // the point is whether the next query is still issued
                }
                try {
                  await query()
                    .select(['id', s.db.connection.raw("'second_query_marker' as marker")])
                    .execute({ mapResults: false });
                } catch {
                  // refused or failed: the marker assertion looks at what reached the database
                }
                handlerSettled.resolve('done');
                ctx.body = { ok: true };
              },
              config: { auth: false },
            },
            {
              // Quick select, to prove the pool is usable
              method: 'GET',
              path: '/abort-fast',
              handler: async (ctx: any) => {
                ctx.body = await query().select('*').execute({ mapResults: false });
              },
              config: { auth: false },
            },
            {
              // A transaction that outlives the client: select, then writes
              method: 'POST',
              path: '/abort-write-tx',
              handler: async (ctx: any) => {
                started.resolve();
                await s.db.transaction(async () => {
                  await query().insert({ name: 'tx before' }).execute();
                  await slow(1.5);
                  await query().insert({ name: 'tx after' }).execute();
                });
                handlerSettled.resolve('done');
                ctx.body = { ok: true };
              },
              config: { auth: false },
            },
            {
              // A write outside any transaction, issued after the client left
              method: 'POST',
              path: '/abort-write-plain',
              handler: async (ctx: any) => {
                started.resolve();
                await sleep(1500);
                await query().insert({ name: 'plain after' }).execute();
                handlerSettled.resolve('done');
                ctx.body = { ok: true };
              },
              config: { auth: false },
            },
            {
              // A document write that commits after the client left: its entry.create event must
              // still be emitted (the hook re-reads the entry with a select)
              method: 'POST',
              path: '/abort-write-event',
              handler: async (ctx: any) => {
                started.resolve();
                await sleep(1500);
                await s.documents(ITEM_UID).create({ data: { name: 'event after' } });
                handlerSettled.resolve('done');
                ctx.body = { ok: true };
              },
              config: { auth: false },
            },
          ],
        });

        s.eventHub.subscribe(async (event: string, data: any) => {
          if (event === 'entry.create' && data?.entry?.name === 'event after') {
            createdEvents.push(event);
          }
        });

        s.db.connection.on('query', (data: { sql?: string }) => {
          issuedSql.push(data.sql ?? '');
        });

        // GraphQL: a resolver awaiting the same kind of slow query
        s.plugin('graphql')
          .service('extension')
          .use({
            typeDefs: /* GraphQL */ `
              type Query {
                abortSlow: String
              }
            `,
            resolvers: {
              Query: {
                async abortSlow() {
                  started.resolve();
                  await slow(SLEEP_SECONDS);
                  return 'done';
                },
              },
            },
          });
      },
    });

    port = (strapi.server.httpServer.address() as any).port;
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  beforeEach(() => {
    started = createDeferred();
    handlerSettled = createDeferred<string>();
    issuedSql.length = 0;
  });

  afterEach(async () => {
    // Do not let a failing test leave sleeping backends behind for the next one
    await strapi.db.connection.raw(
      `select pg_cancel_backend(pid) from pg_stat_activity
       where query like '%pg_sleep(%' and state = 'active' and pid <> pg_backend_pid()`
    );
    await waitUntil(async () => (await runningSleeps()) === 0, 2000);
    await strapi.db.connection('abort_items').where('name', 'like', 'tx %').del();
    await strapi.db.connection('abort_items').where('name', 'plain after').del();
  });

  test('REST: cancels the running select on the database when the client disconnects', async () => {
    const aborted = requestAndAbort({ port, path: '/api/abort-slow' });
    await started.promise;
    await aborted;
    expect(await runningSleeps()).toBe(1); // still running right when the client left

    const cancelled = await waitUntil(async () => (await runningSleeps()) === 0, CANCEL_BUDGET_MS);

    expect(cancelled).toBe(true);
    expect(await waitUntil(() => pool().numUsed() === 0, 1000)).toBe(true);
  });

  test('REST: abandoned slow requests do not starve the pool', async () => {
    // More abandoned requests than pool connections
    await Promise.all(
      Array.from({ length: POOL_MAX + 1 }, () => requestAndAbort({ port, path: '/api/abort-slow' }))
    );

    const startedAt = Date.now();
    const res = await getJson({ port, path: '/api/abort-fast' });

    expect(res.statusCode).toBe(200);
    expect(Date.now() - startedAt).toBeLessThan(CANCEL_BUDGET_MS);
  });

  test('REST: issues no further select after the client disconnected', async () => {
    const aborted = requestAndAbort({ port, path: '/api/abort-then-select' });
    await started.promise;
    await aborted;

    // The handler finishes either way: right after the cancellation, or after the first query ran its course
    await Promise.race([handlerSettled.promise, sleep(4000)]);

    const secondQueryIssued = issuedSql.some((sql) => sql.includes('second_query_marker'));
    expect(secondQueryIssued).toBe(false);
  });

  test('guard: a transaction is not aborted by a disconnect, and still commits its writes', async () => {
    const aborted = requestAndAbort(
      { port, method: 'POST', path: '/api/abort-write-tx', body: '{}' },
      300
    );
    await started.promise;
    await aborted;

    await expect(handlerSettled.promise).resolves.toBe('done');

    const rows = await strapi.db
      .connection('abort_items')
      .where('name', 'like', 'tx %')
      .select('name');
    expect(rows.map((row: { name: string }) => row.name).sort()).toEqual(['tx after', 'tx before']);
  });

  test('guard: a write outside a transaction is still executed after the disconnect', async () => {
    const aborted = requestAndAbort(
      { port, method: 'POST', path: '/api/abort-write-plain', body: '{}' },
      300
    );
    await started.promise;
    await aborted;

    await expect(handlerSettled.promise).resolves.toBe('done');

    const rows = await strapi.db
      .connection('abort_items')
      .where('name', 'plain after')
      .select('id');
    expect(rows).toHaveLength(1);
  });

  test('guard: the entry.create event of a write that committed after the disconnect still fires', async () => {
    const aborted = requestAndAbort(
      { port, method: 'POST', path: '/api/abort-write-event', body: '{}' },
      300
    );
    await started.promise;
    await aborted;

    await expect(handlerSettled.promise).resolves.toBe('done');
    const fired = await waitUntil(() => createdEvents.length > 0, 3000);
    expect(fired).toBe(true);
  });

  test('GraphQL: cancels the running select on the database when the client disconnects', async () => {
    const aborted = requestAndAbort({
      port,
      method: 'POST',
      path: '/graphql',
      body: JSON.stringify({ query: '{ abortSlow }' }),
    });
    await started.promise;
    await aborted;
    expect(await runningSleeps()).toBe(1);

    const cancelled = await waitUntil(async () => (await runningSleeps()) === 0, CANCEL_BUDGET_MS);

    expect(cancelled).toBe(true);
    expect(await waitUntil(() => pool().numUsed() === 0, 1000)).toBe(true);
  });
});
