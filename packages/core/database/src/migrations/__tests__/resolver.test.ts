import path from 'path';
import os from 'os';

import fse from 'fs-extra';
import knex from 'knex';

import { migrationResolver } from '../resolver';
import { createStorage } from '../storage';
import { wrapTransaction } from '../common';

describe('migrationResolver', () => {
  let tempDir: string;
  let sqlite: knex.Knex;
  let db: any;

  beforeEach(async () => {
    tempDir = await fse.mkdtemp(path.join(os.tmpdir(), 'strapi-migration-resolver-'));
    sqlite = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });

    db = {
      getSchemaConnection: () => sqlite.schema,
      getConnection: (tableName?: string) => (tableName ? sqlite(tableName) : sqlite),
      transaction: (fn: (params: { trx: knex.Knex.Transaction }) => Promise<void>) =>
        sqlite.transaction((trx) => fn({ trx })),
    };
  });

  afterEach(async () => {
    await sqlite.destroy();
    await fse.remove(tempDir);
  });

  it('throws when the migration path is missing', () => {
    expect(() => migrationResolver({ name: 'missing.js', context: { db } })).toThrow(
      'Migration missing.js has no path'
    );
  });

  it('runs js migrations inside a transaction', async () => {
    const migrationPath = path.join(tempDir, '001-create.js');
    await fse.writeFile(
      migrationPath,
      `module.exports = {
        async up(knex) {
          await knex.schema.createTable('items', (table) => {
            table.increments('id');
          });
        },
        async down(knex) {
          await knex.schema.dropTable('items');
        },
      };`
    );

    const migration = migrationResolver({
      name: path.basename(migrationPath),
      path: migrationPath,
      context: { db },
    });

    await migration.up();
    expect(await sqlite.schema.hasTable('items')).toBe(true);

    await migration.down();
    expect(await sqlite.schema.hasTable('items')).toBe(false);
  });

  it('runs sql migrations and rejects down', async () => {
    const migrationPath = path.join(tempDir, '001-create.sql');
    await fse.writeFile(migrationPath, 'CREATE TABLE notes (id INTEGER PRIMARY KEY);');

    const migration = migrationResolver({
      name: path.basename(migrationPath),
      path: migrationPath,
      context: { db },
    });

    await migration.up();
    expect(await sqlite.schema.hasTable('notes')).toBe(true);
    await expect(migration.down()).rejects.toThrow('Down migration is not supported for sql files');
  });
});

describe('wrapTransaction', () => {
  it('rolls back when the migration throws', async () => {
    const sqlite = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });

    const db = {
      transaction: (fn: (params: { trx: knex.Knex.Transaction }) => Promise<void>) =>
        sqlite.transaction((trx) => fn({ trx })),
    } as any;

    const wrapped = wrapTransaction(db)(async () => {
      throw new Error('rollback me');
    });

    await expect(wrapped()).rejects.toThrow('rollback me');
    await sqlite.destroy();
  });
});

describe('createStorage integration', () => {
  it('creates the table and tracks executed migrations', async () => {
    const sqlite = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });

    const db = {
      getSchemaConnection: () => sqlite.schema,
      getConnection: (tableName?: string) => (tableName ? sqlite(tableName) : sqlite),
    } as any;

    const storage = createStorage({ db, tableName: 'strapi_migrations_test' });

    await expect(storage.executed()).resolves.toEqual([]);
    expect(await sqlite.schema.hasTable('strapi_migrations_test')).toBe(true);

    await storage.logMigration({ name: '001-first.js' });
    await storage.logMigration({ name: '002-second.js' });

    await expect(storage.executed()).resolves.toEqual(['001-first.js', '002-second.js']);

    await storage.unlogMigration({ name: '002-second.js' });
    await expect(storage.executed()).resolves.toEqual(['001-first.js']);

    await sqlite.destroy();
  });
});
