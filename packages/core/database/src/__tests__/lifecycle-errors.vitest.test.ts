import { rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, describe, expect, it } from 'vitest';

import { Database } from '..';
import type { Model } from '../types';

const tempDbFiles: string[] = [];

// The SQLite dialect resolves the filename to an absolute path, so use a real temporary file
const tempDbFile = () => {
  const file = path.join(
    os.tmpdir(),
    `strapi-lifecycle-errors-${process.pid}-${Math.random().toString(36).slice(2)}.db`
  );
  tempDbFiles.push(file);
  return file;
};

const silentLogger = { info() {}, warn() {}, error() {}, debug() {} };

const ITEM_UID = 'api::item.item';

const models: Model[] = [
  {
    uid: ITEM_UID,
    singularName: 'item',
    tableName: 'items',
    attributes: {
      id: { type: 'increments' },
      name: { type: 'string' },
    },
  },
];

const createSqliteDb = (settings: { poolTimeoutDiagnostics?: boolean } = {}) =>
  new Database({
    connection: {
      client: 'sqlite',
      connection: { filename: tempDbFile() },
      useNullAsDefault: true,
    },
    settings: { migrations: { dir: os.tmpdir() }, ...settings },
    logger: silentLogger,
  });

describe('Database errors outside of its lifecycle', () => {
  let db: Database | undefined;

  afterEach(async () => {
    await db?.destroy();
    db = undefined;
  });

  afterAll(() => {
    for (const file of tempDbFiles) {
      for (const suffix of ['', '-wal', '-shm', '-journal']) {
        rmSync(`${file}${suffix}`, { force: true });
      }
    }
  });

  describe('query() before init()', () => {
    it('says the database is not initialized yet and where to query from', () => {
      db = createSqliteDb();

      expect(() => db!.query(ITEM_UID)).toThrow(
        new Error(
          `Model ${ITEM_UID} not found: the database is not initialized yet. ` +
            'Strapi initializes it when the bootstrap phase starts: query models from a bootstrap function or later, not from a register function.'
        )
      );
    });
  });

  describe('query() after init()', () => {
    it('returns a repository for a known model', async () => {
      db = createSqliteDb();
      await db.init({ models });

      expect(db.query(ITEM_UID)).toBeDefined();
    });

    it('keeps the "not found" message for an unknown model', async () => {
      db = createSqliteDb();
      await db.init({ models });

      expect(() => db!.query('api::unknown.unknown')).toThrow(
        new Error('Model api::unknown.unknown not found')
      );
    });
  });

  describe('queries after destroy()', () => {
    const destroyedMessage =
      'Unable to acquire a connection: the database connection was closed by destroy(). ' +
      'Queries cannot run once the database, or the Strapi instance that owns it, is destroyed.';

    it('runs queries before destroy()', async () => {
      db = createSqliteDb();
      await db.init({ models });

      await expect(db.connection.raw('select 1 as one')).resolves.toBeDefined();
    });

    it('says the connection was closed by destroy() for a raw query', async () => {
      const destroyed = createSqliteDb();
      await destroyed.init({ models });
      await destroyed.destroy();

      await expect(destroyed.connection.raw('select 1')).rejects.toThrow(
        new Error(destroyedMessage)
      );
    });

    it('says the connection was closed by destroy() for a repository query', async () => {
      const destroyed = createSqliteDb();
      await destroyed.init({ models });
      await destroyed.destroy();

      await expect(destroyed.query(ITEM_UID).count()).rejects.toThrow(new Error(destroyedMessage));
    });

    it('keeps the original knex error as the cause', async () => {
      const destroyed = createSqliteDb();
      await destroyed.init({ models });
      await destroyed.destroy();

      const error = await destroyed.connection.raw('select 1').catch((e: unknown) => e);

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).cause).toEqual(new Error('Unable to acquire a connection'));
    });

    it.each([
      ['with pool timeout diagnostics', {}],
      ['without pool timeout diagnostics', { poolTimeoutDiagnostics: false }],
    ])('explains a query once after a second destroy(), %s', async (_, settings) => {
      const destroyed = createSqliteDb(settings);
      await destroyed.init({ models });
      await destroyed.destroy();
      await destroyed.destroy();

      const error = await destroyed.connection.raw('select 1').catch((e: unknown) => e);

      expect(error).toEqual(new Error(destroyedMessage));
      expect((error as Error).cause).toEqual(new Error('Unable to acquire a connection'));
      expect((error as Error).cause).not.toHaveProperty('cause');
    });
  });
});
