/**
 * The counter behind `lockout`: one row per identifier in the generated rate-limit table
 * (`plugin::end-users.rate-limit`, `eu_rate_limits`: `key`, `count`, `lastRequest`), keyed
 * `lockout:<sha256 of the normalized identifier>`, for an account and for an address or username
 * nobody has alike.
 *
 * `reserveAttempt` is one `INSERT ... ON CONFLICT (key) DO UPDATE` (`ON DUPLICATE KEY UPDATE` on
 * MySQL), written with knex so each database gets its own spelling of it. The database applies the
 * increment, so parallel attempts each get their own number and the lock trips at `maxAttempts`
 * however they interleave. A row whose `lastRequest` is older than the window starts again at 1.
 * `lastRequest` moves with every attempt until the count passes `maxAttempts`, and then stays: the
 * lock ends `durationMinutes` after the last attempt that was let through, and trying again while
 * locked does not extend it.
 *
 * The count is read back in the same transaction as the upsert. The upsert holds the row's lock
 * until the transaction ends, so the number read is the one this attempt wrote, on every database
 * (MySQL has no `RETURNING`).
 *
 * MySQL applies the assignments of an `ON DUPLICATE KEY UPDATE` from left to right and lets a later
 * one see the earlier ones; PostgreSQL and SQLite evaluate them all against the old row. The count
 * is assigned first, so the only difference is whether the `lastRequest` rule sees the old count
 * (`<`) or the new one (`<=`).
 */
import { createHash, randomBytes } from 'node:crypto';
import type { Core } from '@strapi/types';

import { RATE_LIMIT_UID } from '../../constants';
import { metadataOf } from '../../utils/typed-strapi';

const MINUTE = 60_000;

/** The database's knex instance (or a transaction of it): the plugin does not depend on knex itself. */
type Connection = Core.Strapi['db']['connection'];

export interface LockoutWindow {
  maxAttempts: number;
  durationMinutes: number;
}

/** `lockout:<sha256>` of an identifier that is already normalized (see `utils/normalize-*.ts`). */
export const lockoutKey = (normalizedIdentifier: string): string =>
  `lockout:${createHash('sha256').update(normalizedIdentifier).digest('hex')}`;

interface Names {
  table: string;
  key: string;
  count: string;
  lastRequest: string;
  documentId?: string;
}

/** The table and column names Strapi gave the generated type, so naming rules are never repeated here. */
const namesOf = (strapi: Core.Strapi): Names => {
  const meta = metadataOf<{
    tableName: string;
    attributes: Record<string, { columnName?: string } | undefined>;
  }>(strapi.db, RATE_LIMIT_UID);
  const column = (attribute: string) => meta.attributes[attribute]?.columnName ?? attribute;

  return {
    table: meta.tableName,
    key: column('key'),
    count: column('count'),
    lastRequest: column('lastRequest'),
    documentId: meta.attributes.documentId ? column('documentId') : undefined,
  };
};

const qualified = (names: Names, column: string) => `${names.table}.${column}`;

/** The upsert, as a query builder: exported so each dialect's SQL can be checked without a server. */
export const reserveQuery = (
  connection: Connection,
  names: Names,
  key: string,
  window: LockoutWindow,
  now: number
) => {
  const expiredBefore = now - window.durationMinutes * MINUTE;
  // The count the `lastRequest` rule sees: the old one, or on MySQL the one just assigned
  const compare = connection.client.dialect === 'mysql' ? '<=' : '<';
  const lastRequest = qualified(names, names.lastRequest);

  return connection(names.table)
    .insert({
      ...(names.documentId ? { [names.documentId]: randomBytes(12).toString('hex') } : {}),
      [names.key]: key,
      [names.count]: 1,
      [names.lastRequest]: now,
    })
    .onConflict(names.key)
    .merge({
      // First: MySQL lets the next assignment see this one
      [names.count]: connection.raw('CASE WHEN ?? < ? THEN 1 ELSE ?? + 1 END', [
        lastRequest,
        expiredBefore,
        qualified(names, names.count),
      ]),
      [names.lastRequest]: connection.raw(
        `CASE WHEN ?? < ? THEN ? WHEN ?? ${compare} ? THEN ? ELSE ?? END`,
        [
          lastRequest,
          expiredBefore,
          now,
          qualified(names, names.count),
          window.maxAttempts,
          now,
          lastRequest,
        ]
      ),
    });
};

/** Counts one attempt for `key` and returns the count including it. */
export const reserveAttempt = async (
  strapi: Core.Strapi,
  key: string,
  window: LockoutWindow
): Promise<number> => {
  const names = namesOf(strapi);
  const { connection } = strapi.db;

  return connection.transaction(async (trx) => {
    await reserveQuery(trx as unknown as Connection, names, key, window, Date.now());

    const row = await trx(names.table).where(names.key, key).first(names.count);

    return Number(row?.[names.count] ?? 1);
  });
};

/** Takes one attempt back (an answer that was not a wrong password), never below zero. */
export const releaseAttempt = async (strapi: Core.Strapi, key: string): Promise<void> => {
  const names = namesOf(strapi);
  const { connection } = strapi.db;

  await connection(names.table)
    .where(names.key, key)
    .where(names.count, '>', 0)
    .update({ [names.count]: connection.raw('?? - 1', [qualified(names, names.count)]) });
};

/** Forgets every attempt for `key`: a success, an unlock, a password reset. */
export const clearAttempts = async (strapi: Core.Strapi, key: string): Promise<void> => {
  const names = namesOf(strapi);

  await strapi.db.connection(names.table).where(names.key, key).delete();
};
