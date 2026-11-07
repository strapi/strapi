import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// eslint-disable-next-line import/no-extraneous-dependencies, node/no-extraneous-import
import knex from 'knex';
import type { Core } from '@strapi/types';

import {
  clearAttempts,
  lockoutKey,
  releaseAttempt,
  reserveAttempt,
  reserveQuery,
} from '../lockout-counter';
import { createLockoutDb, type LockoutDb } from './lockout-db';

const WINDOW = { maxAttempts: 5, durationMinutes: 15 };
const NAMES = {
  table: 'eu_rate_limits',
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

    expect(sql).toMatch(new RegExp(`^insert into ${id('eu_rate_limits')}`));
    expect(sql).toContain(`on conflict (${id('key')}) do update set`);
    expect(sql).toContain(
      `${id('count')} = CASE WHEN ${id('eu_rate_limits')}.${id('last_request')} < ? THEN 1 ELSE`
    );
    // The old count, so the fifth attempt (count 4 before it) still moves the clock
    expect(sql).toContain(`WHEN ${id('eu_rate_limits')}.${id('count')} < ? THEN ?`);
  });

  it('is one ON DUPLICATE KEY UPDATE on MySQL, the count assigned first and read back new', () => {
    const sql = sqlFor('mysql2');

    expect(sql).toMatch(/^insert into `eu_rate_limits`/);
    expect(sql).toMatch(/on duplicate key update `count` = CASE/);
    expect(sql.indexOf('`count` = CASE')).toBeLessThan(sql.indexOf('`last_request` = CASE'));
    // The new count, so the fifth attempt (count 5 after it) still moves the clock
    expect(sql).toMatch(/WHEN `eu_rate_limits`\.`count` <= \? THEN \?/);
  });
});

describe('the counter on a real database', () => {
  let lockoutDb: LockoutDb;
  let strapi: Core.Strapi;

  const row = (key: string) => lockoutDb.connection('eu_rate_limits').where({ key }).first();

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
    expect(await lockoutDb.connection('eu_rate_limits').count({ n: '*' })).toEqual([{ n: 2 }]);
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
