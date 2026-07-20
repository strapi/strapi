import path from 'path';
import os from 'os';

import fse from 'fs-extra';
import knex from 'knex';

import { createUserMigrationProvider } from '../users';
import { createInternalMigrationProvider } from '../internal';
import { createMigrationsProvider } from '../index';
import { createStorage } from '../storage';

jest.mock('../internal-migrations', () => ({
  internalMigrations: [],
}));

const createTestDatabase = (options?: { runMigrations?: boolean; migrationsDir?: string }) => {
  const sqlite = knex({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
  });

  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  const db = {
    getSchemaConnection: () => sqlite.schema,
    getConnection: (tableName?: string) => (tableName ? sqlite(tableName) : sqlite),
    transaction: (fn: (params: { trx: knex.Knex.Transaction }) => Promise<void>) =>
      sqlite.transaction((trx) => fn({ trx })),
    logger,
    config: {
      settings: {
        runMigrations: options?.runMigrations ?? true,
        migrations: {
          dir: options?.migrationsDir ?? '',
        },
      },
    },
  };

  return { db: db as any, sqlite, logger };
};

const writeJsMigration = async (dir: string, filename: string, tableName: string) => {
  await fse.writeFile(
    path.join(dir, filename),
    `module.exports = {
      async up(knex) {
        await knex.schema.createTable('${tableName}', (table) => {
          table.increments('id');
        });
      },
      async down(knex) {
        await knex.schema.dropTable('${tableName}');
      },
    };`
  );
};

describe('migration providers', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fse.mkdtemp(path.join(os.tmpdir(), 'strapi-user-migrations-'));
  });

  afterEach(async () => {
    await fse.remove(tempDir);
  });

  describe('createUserMigrationProvider', () => {
    it('respects runMigrations and discovers js files from the configured directory', async () => {
      await writeJsMigration(tempDir, '001-create.js', 'widgets');

      const { db, sqlite } = createTestDatabase({ migrationsDir: tempDir, runMigrations: false });
      const provider = createUserMigrationProvider(db);

      await expect(provider.shouldRun()).resolves.toBe(false);

      db.config.settings.runMigrations = true;
      await expect(provider.shouldRun()).resolves.toBe(true);

      await provider.up();
      expect(await sqlite.schema.hasTable('widgets')).toBe(true);
      expect(await sqlite('strapi_migrations').select('name')).toEqual([{ name: '001-create.js' }]);

      await provider.up();
      expect(await sqlite('strapi_migrations').select('name')).toEqual([{ name: '001-create.js' }]);

      await provider.down();
      expect(await sqlite.schema.hasTable('widgets')).toBe(false);
      expect(await sqlite('strapi_migrations').select('name')).toEqual([]);

      await sqlite.destroy();
    });

    it('runs multiple user migrations in alphabetical filename order', async () => {
      await writeJsMigration(tempDir, '002-second.js', 'second_table');
      await writeJsMigration(tempDir, '001-first.js', 'first_table');

      const { db, sqlite } = createTestDatabase({ migrationsDir: tempDir });
      const provider = createUserMigrationProvider(db);

      await provider.up();

      expect(await sqlite.schema.hasTable('first_table')).toBe(true);
      expect(await sqlite.schema.hasTable('second_table')).toBe(true);
      expect(await sqlite('strapi_migrations').orderBy('id').select('name')).toEqual([
        { name: '001-first.js' },
        { name: '002-second.js' },
      ]);

      await sqlite.destroy();
    });

    it('skips user migrations already recorded in strapi_migrations', async () => {
      await writeJsMigration(tempDir, '001-create.js', 'widgets');

      const { db, sqlite } = createTestDatabase({ migrationsDir: tempDir });
      const storage = createStorage({ db, tableName: 'strapi_migrations' });
      await storage.executed();
      await storage.logMigration({ name: '001-create.js' });

      const provider = createUserMigrationProvider(db);

      await expect(provider.shouldRun()).resolves.toBe(false);
      await provider.up();

      expect(await sqlite.schema.hasTable('widgets')).toBe(false);
      expect(await sqlite('strapi_migrations').select('name')).toEqual([{ name: '001-create.js' }]);

      await sqlite.destroy();
    });

    it('runs only pending user migrations when some are already logged', async () => {
      await writeJsMigration(tempDir, '001-first.js', 'first_table');
      await writeJsMigration(tempDir, '002-second.js', 'second_table');

      const { db, sqlite } = createTestDatabase({ migrationsDir: tempDir });
      const storage = createStorage({ db, tableName: 'strapi_migrations' });
      await storage.executed();
      await storage.logMigration({ name: '001-first.js' });

      const provider = createUserMigrationProvider(db);

      await expect(provider.shouldRun()).resolves.toBe(true);
      await provider.up();

      expect(await sqlite.schema.hasTable('first_table')).toBe(false);
      expect(await sqlite.schema.hasTable('second_table')).toBe(true);
      expect(await sqlite('strapi_migrations').orderBy('name').select('name')).toEqual([
        { name: '001-first.js' },
        { name: '002-second.js' },
      ]);

      await sqlite.destroy();
    });

    it('applies sql migrations and records the filename', async () => {
      await fse.writeFile(
        path.join(tempDir, '001-notes.sql'),
        'CREATE TABLE notes (id INTEGER PRIMARY KEY);'
      );

      const { db, sqlite } = createTestDatabase({ migrationsDir: tempDir });
      const provider = createUserMigrationProvider(db);

      await provider.up();

      expect(await sqlite.schema.hasTable('notes')).toBe(true);
      expect(await sqlite('strapi_migrations').select('name')).toEqual([{ name: '001-notes.sql' }]);

      await sqlite.destroy();
    });

    it('does not log a failed user migration and does not continue to later ones', async () => {
      await fse.writeFile(
        path.join(tempDir, '001-ok.js'),
        `module.exports = {
          async up(knex) {
            await knex.schema.createTable('ok_table', (table) => {
              table.increments('id');
            });
          },
          async down() { /* noop */ },
        };`
      );
      await fse.writeFile(
        path.join(tempDir, '002-fail.js'),
        `module.exports = {
          async up() {
            throw new Error('intentional failure');
          },
          async down() { /* noop */ },
        };`
      );
      await writeJsMigration(tempDir, '003-skip.js', 'skip_table');

      const { db, sqlite } = createTestDatabase({ migrationsDir: tempDir });
      const provider = createUserMigrationProvider(db);

      await expect(provider.up()).rejects.toThrow('intentional failure');

      expect(await sqlite.schema.hasTable('ok_table')).toBe(true);
      expect(await sqlite.schema.hasTable('skip_table')).toBe(false);
      expect(await sqlite('strapi_migrations').select('name')).toEqual([{ name: '001-ok.js' }]);

      await sqlite.destroy();
    });
  });

  describe('createInternalMigrationProvider', () => {
    it('runs registered migrations through the internal storage table', async () => {
      const { db, sqlite } = createTestDatabase();
      const provider = createInternalMigrationProvider(db);

      await provider.register({
        name: 'test-internal',
        async up(knex) {
          await knex.schema.createTable('internal_only', (table) => {
            table.increments('id');
          });
        },
        async down(knex) {
          await knex.schema.dropTable('internal_only');
        },
      });

      await expect(provider.shouldRun()).resolves.toBe(true);
      await provider.up();
      expect(await sqlite.schema.hasTable('internal_only')).toBe(true);
      expect(await sqlite('strapi_migrations_internal').select('name')).toEqual([
        { name: 'test-internal' },
      ]);

      await sqlite.destroy();
    });

    it('skips registered internal migrations already recorded in storage', async () => {
      const { db, sqlite } = createTestDatabase();
      const up = jest.fn(async (knex: knex.Knex) => {
        await knex.schema.createTable('should_not_exist', (table) => {
          table.increments('id');
        });
      });

      const storage = createStorage({ db, tableName: 'strapi_migrations_internal' });
      await storage.executed();
      await storage.logMigration({ name: 'already-applied' });

      const provider = createInternalMigrationProvider(db);
      await provider.register({
        name: 'already-applied',
        up,
        async down() {
          /* noop */
        },
      });

      await expect(provider.shouldRun()).resolves.toBe(false);
      await provider.up();

      expect(up).not.toHaveBeenCalled();
      expect(await sqlite.schema.hasTable('should_not_exist')).toBe(false);
      expect(await sqlite('strapi_migrations_internal').select('name')).toEqual([
        { name: 'already-applied' },
      ]);

      await sqlite.destroy();
    });

    it('runs registered migrations in registration order and only pending ones', async () => {
      const { db, sqlite } = createTestDatabase();
      const provider = createInternalMigrationProvider(db);
      const order: string[] = [];

      await provider.register({
        name: 'internal-a',
        async up() {
          order.push('a');
        },
        async down() {
          /* noop */
        },
      });
      await provider.register({
        name: 'internal-b',
        async up() {
          order.push('b');
        },
        async down() {
          /* noop */
        },
      });

      const storage = createStorage({ db, tableName: 'strapi_migrations_internal' });
      await storage.executed();
      await storage.logMigration({ name: 'internal-a' });

      await expect(provider.shouldRun()).resolves.toBe(true);
      await provider.up();

      expect(order).toEqual(['b']);
      expect(await sqlite('strapi_migrations_internal').orderBy('name').select('name')).toEqual([
        { name: 'internal-a' },
        { name: 'internal-b' },
      ]);

      await sqlite.destroy();
    });
  });

  describe('createMigrationsProvider', () => {
    it('runs user migrations before internal migrations', async () => {
      await writeJsMigration(tempDir, '001-user.js', 'user_table');

      const { db, sqlite } = createTestDatabase({ migrationsDir: tempDir });
      const provider = createMigrationsProvider(db);

      await provider.providers.internal.register({
        name: 'after-user',
        async up(knex) {
          const hasUserTable = await knex.schema.hasTable('user_table');
          if (!hasUserTable) {
            throw new Error('internal migration ran before user migration');
          }

          await knex.schema.createTable('internal_table', (table) => {
            table.increments('id');
          });
        },
        async down(knex) {
          await knex.schema.dropTable('internal_table');
        },
      });

      await provider.up();

      expect(await sqlite.schema.hasTable('user_table')).toBe(true);
      expect(await sqlite.schema.hasTable('internal_table')).toBe(true);

      await sqlite.destroy();
    });

    it('shouldRun is false when user and internal providers have nothing pending', async () => {
      const { db, sqlite } = createTestDatabase({ migrationsDir: tempDir });
      const provider = createMigrationsProvider(db);

      await expect(provider.shouldRun()).resolves.toBe(false);
      await provider.up();

      expect(await sqlite.schema.hasTable('strapi_migrations')).toBe(true);
      expect(await sqlite.schema.hasTable('strapi_migrations_internal')).toBe(true);

      await sqlite.destroy();
    });
  });
});
