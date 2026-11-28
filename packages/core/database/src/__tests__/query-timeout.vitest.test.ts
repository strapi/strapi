import os from 'node:os';
import path from 'node:path';
import createKnex from 'knex';
import { afterAll, afterEach, describe, expect, it } from 'vitest';

import { Database } from '..';
import { applyQueryTimeout } from '../utils/knex';

// The SQLite dialect resolves the filename to an absolute path, so use a real temporary file
const tempDbFile = () =>
  path.join(
    os.tmpdir(),
    `strapi-query-timeout-${process.pid}-${Math.random().toString(36).slice(2)}.db`
  );

const silentLogger = { info() {}, warn() {}, error() {}, debug() {} };

const ITEM_UID = 'api::item.item';

const createSqliteDb = (settings: Record<string, unknown> = {}) =>
  new Database({
    connection: {
      client: 'sqlite',
      connection: { filename: tempDbFile() },
      useNullAsDefault: true,
    },
    settings: { migrations: { dir: os.tmpdir() }, ...settings },
    logger: silentLogger,
  });

describe('settings.queryTimeout', () => {
  let db: Database | undefined;

  afterEach(async () => {
    await db?.destroy();
    db = undefined;
  });

  describe('validation', () => {
    it.each([['5000'], [0], [-1], [Number.NaN], [Number.POSITIVE_INFINITY]])(
      'refuses %j',
      (queryTimeout) => {
        expect(() => createSqliteDb({ queryTimeout })).toThrow(
          /Invalid database setting "queryTimeout": expected a positive number of milliseconds/
        );
      }
    );

    it.each([
      ['5000', 'received "5000"'],
      [Number.NaN, 'received NaN'],
      [Number.POSITIVE_INFINITY, 'received Infinity'],
      [null, 'received null'],
    ])('reports %j as %s', (queryTimeout, message) => {
      expect(() => createSqliteDb({ queryTimeout })).toThrow(message);
    });

    it('accepts a positive number', () => {
      db = createSqliteDb({ queryTimeout: 5000 });

      expect(db.config.settings.queryTimeout).toBe(5000);
    });
  });

  describe('on sqlite, which cannot cancel queries', () => {
    it('is ignored, so raw and query builder queries still run', async () => {
      db = createSqliteDb({ queryTimeout: 50 });
      await db.init({
        models: [
          {
            uid: ITEM_UID,
            singularName: 'item',
            tableName: 'items',
            attributes: {
              id: { type: 'increments' },
              name: { type: 'string' },
            },
          },
        ],
      });

      await db.connection.schema.createTable('items', (table) => {
        table.increments('id');
        table.string('name');
      });

      await db.queryBuilder(ITEM_UID).insert({ name: 'first' }).execute();
      const rows = await db.queryBuilder(ITEM_UID).select('*').execute();

      expect(rows).toEqual([{ id: 1, name: 'first' }]);
      await expect(applyQueryTimeout(db.connection.raw('select 1 as one'), db)).resolves.toEqual([
        { one: 1 },
      ]);
    });
  });

  describe('applyQueryTimeout', () => {
    // A pg knex instance builds queries without ever connecting, which is all these tests need
    const pg = createKnex({ client: 'pg' });
    const fakeDb = (queryTimeout?: number) =>
      ({ config: { settings: { queryTimeout } }, connection: pg }) as unknown as Database;

    afterAll(async () => {
      await pg.destroy();
    });

    it('applies a cancelling timeout on a client that can cancel queries', () => {
      const query = applyQueryTimeout(pg('items').select('*'), fakeDb(500));

      expect(query.toSQL()).toMatchObject({ timeout: 500, cancelOnTimeout: true });
    });

    it('applies it to raw queries too', () => {
      const query = applyQueryTimeout(pg.raw('select 1'), fakeDb(500));

      expect(query.toSQL()).toMatchObject({ timeout: 500, cancelOnTimeout: true });
    });

    it('leaves the query untouched when no timeout is configured', () => {
      const query = applyQueryTimeout(pg('items').select('*'), fakeDb());

      expect(query.toSQL()).toMatchObject({ timeout: false });
    });
  });
});
