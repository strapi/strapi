import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import knex from 'knex';
import { betterAuth } from 'better-auth/minimal';
import { memoryAdapter } from 'better-auth/adapters/memory';
import type { Core } from '@strapi/types';

import {
  clearAttempts,
  enrollmentKey,
  lockoutKey,
  pruneExpired,
  releaseAttempt,
  reserveAttempt,
  reserveQuery,
} from '../lockout-counter';
import { createLockoutDb, type LockoutDb } from './lockout-db';
import { lockout } from '../plugins/lockout';
import { strapiAdapter } from '../adapter/adapter';

const WINDOW = { maxAttempts: 5, durationMinutes: 15 };
const NAMES = {
  table: 'eu_lockout_counters',
  key: 'key',
  count: 'count',
  lastRequest: 'last_request',
};

describe('lockoutKey', () => {
  it('is a hash of the identifier under a lockout prefix, never the identifier', () => {
    const key = lockoutKey('ann@example.com');

    expect(key).toMatch(/^lockout:[0-9a-f]{64}$/);
    expect(key).not.toContain('ann');
    expect(lockoutKey('ann@example.com')).toBe(key);
    expect(lockoutKey('bob@example.com')).not.toBe(key);
  });
});

describe('reserveQuery', () => {
  const sqlFor = (client: string) =>
    reserveQuery(knex({ client }), NAMES, 'lockout:k', WINDOW, 1_000_000).toSQL().sql;

  it.each([
    ['pg', '"'],
    ['better-sqlite3', '`'],
  ])('is one upsert on %s, the old row seen by every assignment', (client, q) => {
    const sql = sqlFor(client);
    const id = (name: string) => `${q}${name}${q}`;

    expect(sql).toMatch(new RegExp(`^insert into ${id('eu_lockout_counters')}`));
    expect(sql).toContain(`on conflict (${id('key')}) do update set`);
    expect(sql).toContain(
      `${id('count')} = CASE WHEN ${id('eu_lockout_counters')}.${id('last_request')} < ? THEN 1 ELSE`
    );
    // The old count, so the fifth attempt (count 4 before it) still moves the clock
    expect(sql).toContain(`WHEN ${id('eu_lockout_counters')}.${id('count')} < ? THEN ?`);
  });

  it('is one ON DUPLICATE KEY UPDATE on MySQL, the count assigned first and read back new', () => {
    const sql = sqlFor('mysql2');

    expect(sql).toMatch(/^insert into `eu_lockout_counters`/);
    expect(sql).toMatch(/on duplicate key update `count` = CASE/);
    expect(sql.indexOf('`count` = CASE')).toBeLessThan(sql.indexOf('`last_request` = CASE'));
    // The new count, so the fifth attempt (count 5 after it) still moves the clock
    expect(sql).toMatch(/WHEN `eu_lockout_counters`\.`count` <= \? THEN \?/);
  });
});

describe('the counter on a real database', () => {
  let lockoutDb: LockoutDb;
  let strapi: Core.Strapi;

  const row = (key: string) => lockoutDb.connection('eu_lockout_counters').where({ key }).first();

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-05T10:00:00Z'));
    lockoutDb = await createLockoutDb();
    strapi = { db: lockoutDb.db } as unknown as Core.Strapi;
  });

  afterEach(async () => {
    vi.useRealTimers();
    await lockoutDb.connection.destroy();
  });

  it('counts up from one and keeps a single row per key', async () => {
    const counts = [
      await reserveAttempt(strapi, 'a', WINDOW),
      await reserveAttempt(strapi, 'a', WINDOW),
      await reserveAttempt(strapi, 'b', WINDOW),
      await reserveAttempt(strapi, 'a', WINDOW),
    ];

    expect(counts).toEqual([1, 2, 1, 3]);
    expect(await lockoutDb.connection('eu_lockout_counters').count({ n: '*' })).toEqual([{ n: 2 }]);
    expect((await row('a'))?.document_id).toMatch(/^[0-9a-f]{24}$/);
  });

  it('gives parallel attempts each a number of their own', async () => {
    const counts = await Promise.all(
      Array.from({ length: 30 }, () => reserveAttempt(strapi, 'a', WINDOW))
    );

    expect([...counts].sort((a, b) => a - b)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  });

  it('starts again at one when the row is older than the window', async () => {
    await reserveAttempt(strapi, 'a', WINDOW);
    await reserveAttempt(strapi, 'a', WINDOW);

    vi.setSystemTime(new Date('2026-11-05T10:15:00Z'));
    expect(await reserveAttempt(strapi, 'a', WINDOW)).toBe(3);

    vi.setSystemTime(new Date('2026-11-05T10:30:01Z'));
    expect(await reserveAttempt(strapi, 'a', WINDOW)).toBe(1);
  });

  it('moves the clock up to maxAttempts and then stops, so the lock does not extend', async () => {
    for (let i = 0; i < 5; i += 1) {
      await reserveAttempt(strapi, 'a', WINDOW);
    }

    const fifth = Number((await row('a'))?.last_request);

    vi.setSystemTime(new Date('2026-11-05T10:05:00Z'));
    expect(await reserveAttempt(strapi, 'a', WINDOW)).toBe(6);
    expect(Number((await row('a'))?.last_request)).toBe(fifth);
  });

  it('takes an attempt back, never below zero, and forgets a key', async () => {
    await reserveAttempt(strapi, 'a', WINDOW);
    await reserveAttempt(strapi, 'a', WINDOW);
    await releaseAttempt(strapi, 'a');

    expect((await row('a'))?.count).toBe(1);

    await releaseAttempt(strapi, 'a');
    await releaseAttempt(strapi, 'a');

    expect((await row('a'))?.count).toBe(0);

    await clearAttempts(strapi, 'a');

    expect(await row('a')).toBeUndefined();
  });
});

describe('enrollmentKey', () => {
  it('is its own counter per user, in a shape no identifier hashes to', () => {
    expect(enrollmentKey('u1')).toMatch(/^lockout:totp-enroll:[0-9a-f]{64}$/);
    expect(enrollmentKey('u1')).not.toContain('u1');
    expect(enrollmentKey('u1')).not.toBe(enrollmentKey('u2'));
    expect(enrollmentKey('u1')).not.toBe(lockoutKey('u1'));
  });
});

describe('the pruning of the counter table', () => {
  let lockoutDb: LockoutDb;
  let strapi: Core.Strapi;

  const keys = async () =>
    (await lockoutDb.connection('eu_lockout_counters').select('key')).map((r) => r.key).sort();

  /** Lets the prune that `reserveAttempt` starts in the background finish */
  const settle = () =>
    new Promise<void>((resolve) => {
      setImmediate(resolve);
    });

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-05T10:00:00Z'));
    lockoutDb = await createLockoutDb();
    strapi = { db: lockoutDb.db, log: { warn: vi.fn() } } as unknown as Core.Strapi;
  });

  afterEach(async () => {
    vi.useRealTimers();
    await lockoutDb.connection.destroy();
  });

  it('deletes a row only once its window and its lock have both run out', async () => {
    await reserveAttempt(strapi, 'old', WINDOW);
    // A row that reached the cap: it stays locked for the duration after its last counted attempt
    for (let i = 0; i < 6; i += 1) {
      await reserveAttempt(strapi, 'locked', WINDOW);
    }

    vi.setSystemTime(new Date('2026-11-05T10:14:59Z'));
    await reserveAttempt(strapi, 'fresh', WINDOW);
    expect(await pruneExpired(strapi, WINDOW, Date.now())).toBe(0);

    // One second past the duration: the rows from 10:00 are over, the one from 10:14:59 is not
    vi.setSystemTime(new Date('2026-11-05T10:15:01Z'));
    expect(await pruneExpired(strapi, WINDOW, Date.now())).toBe(2);
    expect(await keys()).toEqual(['fresh']);
  });

  it('keeps a row that is still inside its window at the exact cutoff', async () => {
    await reserveAttempt(strapi, 'edge', WINDOW);

    vi.setSystemTime(new Date('2026-11-05T10:15:00Z'));

    expect(await pruneExpired(strapi, WINDOW, Date.now())).toBe(0);
    expect(await keys()).toEqual(['edge']);
  });

  it('runs from reserveAttempt at most once a minute, and the attempt does not wait for it', async () => {
    await reserveAttempt(strapi, 'old', WINDOW);
    await settle();

    // 20 minutes on: the first attempt after it prunes the old row
    vi.setSystemTime(new Date('2026-11-05T10:20:00Z'));
    await reserveAttempt(strapi, 'a', WINDOW);
    await settle();
    expect(await keys()).toEqual(['a']);

    // Within the minute: a row that is over stays until the next interval
    await lockoutDb.connection('eu_lockout_counters').insert({
      key: 'stale',
      count: 1,
      last_request: Date.parse('2026-11-05T09:00:00Z'),
    });
    vi.setSystemTime(new Date('2026-11-05T10:20:30Z'));
    await reserveAttempt(strapi, 'b', WINDOW);
    await settle();
    expect(await keys()).toEqual(['a', 'b', 'stale']);

    vi.setSystemTime(new Date('2026-11-05T10:21:01Z'));
    await reserveAttempt(strapi, 'c', WINDOW);
    await settle();
    expect(await keys()).toEqual(['a', 'b', 'c']);
  });

  it('logs a failed prune and still counts the attempt', async () => {
    const real = lockoutDb.connection;
    const failing = {
      ...lockoutDb.db,
      connection: new Proxy(real, {
        apply(target, thisArg, args) {
          const builder = Reflect.apply(target, thisArg, args);

          // Only the prune's DELETE is made outside a transaction
          builder.delete = () => Promise.reject(new Error('lock wait timeout'));

          return builder;
        },
      }),
    };
    const broken = { db: failing, log: { warn: vi.fn() } } as unknown as Core.Strapi;

    expect(await reserveAttempt(broken, 'a', WINDOW)).toBe(1);
    await settle();

    expect(broken.log.warn).toHaveBeenCalledWith(expect.stringContaining('lock wait timeout'));
  });
});

describe('the pruning of Better Auth`s rate limiter', () => {
  let lockoutDb: LockoutDb;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-05T10:00:00Z'));
    lockoutDb = await createLockoutDb();
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    await lockoutDb.connection.destroy();
  });

  it('cannot reach a lockout row: the delete it runs on the `rateLimit` model is the other table`s', async () => {
    const strapi = { db: lockoutDb.db } as unknown as Core.Strapi;
    const { connection } = lockoutDb;

    // The model Better Auth deletes from, and the model the plugin declares for the counters, as
    // the engine builds them: both are in the schema the adapter reads
    const options = {
      secret: ['prune', 'test', 'secret', 'long', 'enough', 'to', 'use'].join('-'),
      baseURL: 'http://localhost:1337',
      telemetry: { enabled: false },
      database: memoryAdapter({}),
      rateLimit: { storage: 'database' as const },
      plugins: [lockout(strapi)],
    };
    const { $context } = betterAuth(options);
    const { options: built } = await $context;

    // Where each model is stored, as Strapi's metadata says
    const deleted: Array<{ uid: string; where: Record<string, Record<string, number>> }> = [];

    vi.stubGlobal('strapi', {
      getModel: () => ({
        attributes: { key: {}, count: {}, lastRequest: {}, documentId: {} },
      }),
      db: {
        query: (uid: string) => ({
          async deleteMany({ where }: { where: Record<string, Record<string, number>> }) {
            deleted.push({ uid, where });

            const { tableName: table } = lockoutDb.db.metadata.get(uid) as { tableName: string };
            const count = await connection(table)
              .where('last_request', '<', where.lastRequest.$lt)
              .delete();

            return { count };
          },
        }),
      },
    });

    const adapter = strapiAdapter()(built);

    // A lockout that began an hour ago and has 15 minutes to run, and an old rate-limit row
    await reserveAttempt(strapi, 'lockout:locked', WINDOW);
    await connection('eu_rate_limits').insert({
      key: '127.0.0.1/sign-in',
      count: 3,
      last_request: Date.now(),
    });
    vi.setSystemTime(new Date('2026-11-05T10:00:50Z'));

    // What Better Auth runs after a window rolls over: everything older than its longest window
    const cutoff = Date.now() - 60_000;

    await adapter.deleteMany({
      model: 'rateLimit',
      where: [{ field: 'lastRequest', operator: 'lt', value: cutoff }],
    });

    vi.setSystemTime(new Date('2026-11-05T10:05:00Z'));
    await adapter.deleteMany({
      model: 'rateLimit',
      where: [{ field: 'lastRequest', operator: 'lt', value: Date.now() - 60_000 }],
    });

    expect(deleted.map((call) => call.uid)).toEqual([
      'plugin::end-users.rate-limit',
      'plugin::end-users.rate-limit',
    ]);
    // The rate-limit row is pruned, as it always was
    expect(await connection('eu_rate_limits').count({ n: '*' })).toEqual([{ n: 0 }]);
    // The counter is still there, five minutes in, with its count
    expect(
      await connection('eu_lockout_counters').where({ key: 'lockout:locked' }).first()
    ).toMatchObject({ count: 1 });
  });
});
