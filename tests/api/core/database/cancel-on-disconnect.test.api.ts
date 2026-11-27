import http from 'node:http';
import dotenv from 'dotenv';
import type { Core } from '@strapi/types';

import { createStrapiInstance, superAdmin } from 'api-tests/strapi';
import { createTestBuilder } from 'api-tests/builder';
import { createRequest } from 'api-tests/request';

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
// Holds the admin logout request back, so the client disconnects before authentication runs
const LOGOUT_DELAY_MS = 1000;

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

/**
 * Sends a request. `disconnect()` destroys the socket, like a client that hangs up, and resolves
 * once the connection closed.
 */
const startRequest = ({
  port,
  method = 'GET',
  path,
  body,
  headers = {},
}: {
  port: number;
  method?: string;
  path: string;
  body?: string;
  headers?: Record<string, string>;
}) => {
  const request = http.request({
    method,
    port,
    path,
    headers: body ? { 'content-type': 'application/json', ...headers } : headers,
  });
  const closed = new Promise<void>((resolve) => {
    request.on('close', () => resolve());
  });
  request.on('error', () => {});
  request.end(body);

  return {
    closed,
    disconnect: () => {
      request.destroy();
      return closed;
    },
  };
};

/** Sends a request and destroys the socket `afterMs` later, before any response could end. */
const requestAndAbort = (
  options: Parameters<typeof startRequest>[0],
  afterMs = DISCONNECT_AFTER_MS
) => {
  const request = startRequest(options);
  setTimeout(() => request.disconnect(), afterMs);
  return request.closed;
};

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
      .andWhereRaw('datname = current_database()')
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
        s.config.set('database.settings.abortReadsOnRequestDisconnect', true);
      },
      bootstrap: ({ strapi: s }: { strapi: Core.Strapi }) => {
        const query = () => s.db.queryBuilder(ITEM_UID);
        const slow = (seconds: number) =>
          query()
            .select(['id', s.db.connection.raw(`pg_sleep(${seconds})`)])
            .execute({ mapResults: false });
        // Proves the request is armed and its client gone: a read before any write is refused
        const readIsRefused = async () => {
          try {
            await query().select('id').execute({ mapResults: false });
            return false;
          } catch (error: any) {
            return error?.name === 'QueryAbortedError';
          }
        };
        const notArmed = 'not armed: a read before the write was not refused';

        // Delays admin logout so the client is gone before the auth strategy reads the session
        s.server.use(async (ctx: any, next: () => Promise<any>) => {
          if (ctx.path === '/admin/logout') {
            await sleep(LOGOUT_DELAY_MS);
          }
          return next();
        });

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
              // A slow read inside a transaction that has not written anything
              method: 'GET',
              path: '/abort-read-tx',
              handler: async (ctx: any) => {
                started.resolve();
                ctx.body = await s.db.transaction(() => slow(SLEEP_SECONDS));
              },
              config: { auth: false },
            },
            {
              // A slow read sent with POST: POST requests are never armed, so it must complete
              method: 'POST',
              path: '/abort-post-read',
              handler: async (ctx: any) => {
                started.resolve();
                try {
                  ctx.body = await slow(1.5);
                  handlerSettled.resolve('done');
                } catch (error: any) {
                  handlerSettled.resolve(`failed: ${error?.name}`);
                  throw error;
                }
              },
              config: { auth: false },
            },
            {
              // A GET route that opted out (it writes, e.g. a provider callback): must complete
              method: 'GET',
              path: '/abort-get-opt-out',
              handler: async (ctx: any) => {
                started.resolve();
                try {
                  ctx.body = await slow(1.5);
                  handlerSettled.resolve('done');
                } catch (error: any) {
                  handlerSettled.resolve(`failed: ${error?.name}`);
                  throw error;
                }
              },
              config: { auth: false, abortReadsOnRequestDisconnect: false },
            },
            {
              // A document service read: it runs inside a transaction (wrapInTransaction)
              method: 'GET',
              path: '/abort-document-read',
              handler: async (ctx: any) => {
                started.resolve();
                try {
                  ctx.body = await s.documents(ITEM_UID).findMany();
                  handlerSettled.resolve('done');
                } catch (error: any) {
                  handlerSettled.resolve(`failed: ${error?.name}`);
                  throw error;
                }
              },
              config: { auth: false },
            },
            // The routes below write on a GET, so the request is armed: they check that a write,
            // and what reads around it, run to completion once the client is gone
            {
              // A transaction that starts after the client left: writes, a slow select, then writes
              // again. Once it wrote, none of its reads is refused
              method: 'GET',
              path: '/abort-write-tx',
              handler: async (ctx: any) => {
                started.resolve();
                // Once the client is gone: the request is armed, so a read before any write is
                // refused. It runs outside the transaction, which it would otherwise roll back.
                await sleep(1000);
                const armed = await readIsRefused();
                await s.db.transaction(async () => {
                  await query().insert({ name: 'tx before' }).execute();
                  await slow(1.5);
                  await query().insert({ name: 'tx after' }).execute();
                });
                handlerSettled.resolve(armed ? 'done' : notArmed);
                ctx.body = { ok: true };
              },
              config: { auth: false },
            },
            {
              // A write outside any transaction, issued after the client left
              method: 'GET',
              path: '/abort-write-plain',
              handler: async (ctx: any) => {
                started.resolve();
                await sleep(1500);
                const armed = await readIsRefused();
                await query().insert({ name: 'plain after' }).execute();
                handlerSettled.resolve(armed ? 'done' : notArmed);
                ctx.body = { ok: true };
              },
              config: { auth: false },
            },
            {
              // A document write that commits after the client left: its entry.create event must
              // still be emitted (the hook re-reads the entry with a select)
              method: 'GET',
              path: '/abort-write-event',
              handler: async (ctx: any) => {
                started.resolve();
                await sleep(1500);
                const armed = await readIsRefused();
                try {
                  await s.documents(ITEM_UID).create({ data: { name: 'event after' } });
                  handlerSettled.resolve(armed ? 'done' : notArmed);
                } catch (error: any) {
                  handlerSettled.resolve(`failed: ${error?.name}`);
                  throw error;
                }
                ctx.body = { ok: true };
              },
              config: { auth: false },
            },
            {
              // A query engine write after the client left: create reads the row back and runs
              // afterCreate, and the flow's reads after the write are not refused either
              method: 'GET',
              path: '/abort-write-query-engine',
              handler: async (ctx: any) => {
                started.resolve();
                await sleep(1500);
                const armed = await readIsRefused();
                try {
                  const created = await s.db
                    .query(ITEM_UID)
                    .create({ data: { name: 'query engine after' } });
                  const rows = await s.db
                    .query(ITEM_UID)
                    .findMany({ where: { name: 'query engine after' } });
                  if (!armed) {
                    handlerSettled.resolve(notArmed);
                  } else {
                    handlerSettled.resolve(
                      created?.name === 'query engine after' && rows.length === 1
                        ? 'done'
                        : `unexpected: ${JSON.stringify({ created, rows })}`
                    );
                  }
                } catch (error: any) {
                  handlerSettled.resolve(`failed: ${error?.name}`);
                  throw error;
                }
                ctx.body = { ok: true };
              },
              config: { auth: false },
            },
          ],
        });

        s.db.lifecycles.subscribe({
          models: [ITEM_UID],
          async afterCreate(event: any) {
            if (event.result?.name === 'query engine after') {
              createdEvents.push('afterCreate');
            }
          },
        });

        // Like review workflows (before) and content history (after): a document middleware that
        // reads outside the write's transaction must not make the write fail after a disconnect
        s.documents.use(async (context: any, next: () => Promise<any>) => {
          if (context.uid !== ITEM_UID || context.action !== 'create') {
            return next();
          }

          await s.db.query(ITEM_UID).findOne({ where: { name: 'only row' } });
          const result = await next();
          await s.db.query(ITEM_UID).findMany({ where: { documentId: result.documentId } });
          return result;
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
              type Mutation {
                abortSlowMutation: String
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
              Mutation: {
                // A slow read in a mutation: mutations are never armed, so it must complete
                async abortSlowMutation() {
                  started.resolve();
                  try {
                    await slow(1.5);
                    handlerSettled.resolve('done');
                  } catch (error: any) {
                    handlerSettled.resolve(`failed: ${error?.name}`);
                    throw error;
                  }
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
    createdEvents.length = 0;
  });

  afterEach(async () => {
    // Do not let a failing test leave sleeping backends behind for the next one
    await strapi.db.connection.raw(
      `select pg_cancel_backend(pid) from pg_stat_activity
       where query like '%pg_sleep(%' and state = 'active' and pid <> pg_backend_pid()
       and datname = current_database()`
    );
    await waitUntil(async () => (await runningSleeps()) === 0, 2000);
    await strapi.db.connection('abort_items').where('name', 'like', 'tx %').del();
    await strapi.db.connection('abort_items').where('name', 'plain after').del();
    await strapi.db.connection('abort_items').where('name', 'event after').del();
    await strapi.db.connection('abort_items').where('name', 'query engine after').del();
    await strapi.db.query('admin::session').deleteMany({});
  });

  test('REST: cancels the running select on the database when the client disconnects', async () => {
    const request = startRequest({ port, path: '/api/abort-slow' });
    await started.promise;
    // The select is really running on the database before the client leaves
    expect(await waitUntil(async () => (await runningSleeps()) === 1, 3000)).toBe(true);
    await request.disconnect();

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

  test('REST: cancels a read inside a transaction that has not written', async () => {
    const request = startRequest({ port, path: '/api/abort-read-tx' });
    await started.promise;
    expect(await waitUntil(async () => (await runningSleeps()) === 1, 3000)).toBe(true);
    await request.disconnect();

    const cancelled = await waitUntil(async () => (await runningSleeps()) === 0, CANCEL_BUDGET_MS);

    expect(cancelled).toBe(true);
    expect(await waitUntil(() => pool().numUsed() === 0, 1000)).toBe(true);
  });

  test('REST: cancels a document service findMany when the client disconnects', async () => {
    // Hold a lock so the findMany waits on the database until it is cancelled. The lock holder
    // takes one of the two pool connections, so the checks below run on it too.
    const lock = await strapi.db.connection.transaction();
    const waitingOnLock = async () => {
      // pg_stat_activity is a snapshot taken once per transaction: refresh it on every check
      await lock.raw('select pg_stat_clear_snapshot()');
      const rows = await lock
        .select('pid')
        .from('pg_stat_activity')
        .where('wait_event_type', 'Lock')
        .andWhere('query', 'like', '%abort_items%')
        .andWhereRaw('pid <> pg_backend_pid()');

      return rows.length;
    };

    try {
      await lock.raw('lock table abort_items in access exclusive mode');

      const aborted = requestAndAbort({ port, path: '/api/abort-document-read' });
      await started.promise;
      expect(await waitUntil(async () => (await waitingOnLock()) === 1, 2000)).toBe(true);
      await aborted;

      // Cancelled while the lock is still held: without the cancel, the read would wait for it
      expect(await waitUntil(async () => (await waitingOnLock()) === 0, CANCEL_BUDGET_MS)).toBe(
        true
      );
      await expect(
        Promise.race([handlerSettled.promise, sleep(CANCEL_BUDGET_MS).then(() => 'still waiting')])
      ).resolves.toBe('failed: QueryAbortedError');
    } finally {
      await lock.rollback();
    }
  });

  test('guard (GET, armed): a transaction that wrote is not aborted by a disconnect, and still commits its writes', async () => {
    const aborted = requestAndAbort({ port, path: '/api/abort-write-tx' }, 300);
    await started.promise;
    await aborted;

    await expect(handlerSettled.promise).resolves.toBe('done');

    const rows = await strapi.db
      .connection('abort_items')
      .where('name', 'like', 'tx %')
      .select('name');
    expect(rows.map((row: { name: string }) => row.name).sort()).toEqual(['tx after', 'tx before']);
  });

  test('guard (GET, armed): a write outside a transaction is still executed after the disconnect', async () => {
    const aborted = requestAndAbort({ port, path: '/api/abort-write-plain' }, 300);
    await started.promise;
    await aborted;

    await expect(handlerSettled.promise).resolves.toBe('done');

    const rows = await strapi.db
      .connection('abort_items')
      .where('name', 'plain after')
      .select('id');
    expect(rows).toHaveLength(1);
  });

  test('guard (GET, armed): a document write and its middlewares run to completion, and its entry.create event fires', async () => {
    const aborted = requestAndAbort({ port, path: '/api/abort-write-event' }, 300);
    await started.promise;
    await aborted;

    await expect(handlerSettled.promise).resolves.toBe('done');
    const fired = await waitUntil(() => createdEvents.length > 0, 3000);
    expect(fired).toBe(true);
  });

  test('guard (GET, armed): a query engine create reads its row back and runs afterCreate after the disconnect', async () => {
    const aborted = requestAndAbort({ port, path: '/api/abort-write-query-engine' }, 300);
    await started.promise;
    await aborted;

    await expect(handlerSettled.promise).resolves.toBe('done');
    expect(createdEvents).toEqual(['afterCreate']);

    const rows = await strapi.db
      .connection('abort_items')
      .where('name', 'query engine after')
      .select('id');
    expect(rows).toHaveLength(1);
  });

  test('scope: a read sent with POST is not cancelled by a disconnect', async () => {
    await requestAndAbort({ port, method: 'POST', path: '/api/abort-post-read', body: '{}' }, 300);

    await expect(handlerSettled.promise).resolves.toBe('done');
  });

  test('scope: a GET route that opted out is not cancelled by a disconnect', async () => {
    await requestAndAbort({ port, path: '/api/abort-get-opt-out' }, 300);

    await expect(handlerSettled.promise).resolves.toBe('done');
  });

  test('GraphQL: a mutation is not cancelled by a disconnect', async () => {
    await requestAndAbort(
      {
        port,
        method: 'POST',
        path: '/graphql',
        body: JSON.stringify({ query: 'mutation { abortSlowMutation }' }),
      },
      300
    );

    await expect(handlerSettled.promise).resolves.toBe('done');
  });

  test('admin logout (POST, never armed) revokes the session even when the client leaves before authentication', async () => {
    const cookieName = 'strapi_admin_refresh';
    const loginRes = await createRequest({ strapi }).post('/admin/login', {
      body: superAdmin.loginInfo,
    });
    expect(loginRes.statusCode).toBe(200);
    const cookiePair = ((loginRes.headers['set-cookie'] || []) as string[])
      .find((cookie) => cookie.startsWith(`${cookieName}=`))!
      .split(';')[0];

    const tokenRes = await createRequest({ strapi }).post('/admin/access-token', {
      headers: { Cookie: cookiePair },
    });
    expect(tokenRes.statusCode).toBe(200);
    const accessToken = tokenRes.body.data.token as string;
    expect(await strapi.db.query('admin::session').count()).toBeGreaterThan(0);

    await requestAndAbort(
      {
        port,
        method: 'POST',
        path: '/admin/logout',
        body: '{}',
        headers: { authorization: `Bearer ${accessToken}` },
      },
      300
    );

    const revoked = await waitUntil(
      async () => (await strapi.db.query('admin::session').count()) === 0,
      LOGOUT_DELAY_MS + 3000
    );
    expect(revoked).toBe(true);

    const refreshRes = await createRequest({ strapi }).post('/admin/access-token', {
      headers: { Cookie: cookiePair },
    });
    expect(refreshRes.statusCode).toBe(401);
  });

  test('GraphQL: cancels the running select of a query (POST) when the client disconnects', async () => {
    const request = startRequest({
      port,
      method: 'POST',
      path: '/graphql',
      body: JSON.stringify({ query: '{ abortSlow }' }),
    });
    await started.promise;
    expect(await waitUntil(async () => (await runningSleeps()) === 1, 3000)).toBe(true);
    await request.disconnect();

    const cancelled = await waitUntil(async () => (await runningSleeps()) === 0, CANCEL_BUDGET_MS);

    expect(cancelled).toBe(true);
    expect(await waitUntil(() => pool().numUsed() === 0, 1000)).toBe(true);
  });
});
