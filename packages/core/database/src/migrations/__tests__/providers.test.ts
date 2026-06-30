import path from 'path';
import os from 'os';

import fse from 'fs-extra';
import knex from 'knex';

import { createUserMigrationProvider } from '../users';
import { createInternalMigrationProvider } from '../internal';
import { createMigrationsProvider } from '../index';

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
      await fse.writeFile(
        path.join(tempDir, '001-create.js'),
        `module.exports = {
          async up(knex) {
            await knex.schema.createTable('widgets', (table) => {
              table.increments('id');
            });
          },
          async down(knex) {
            await knex.schema.dropTable('widgets');
          },
        };`
      );

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
  });

  describe('createMigrationsProvider', () => {
    it('runs user migrations before internal migrations', async () => {
      await fse.writeFile(
        path.join(tempDir, '001-user.js'),
        `module.exports = {
          async up(knex) {
            await knex.schema.createTable('user_table', (table) => {
              table.increments('id');
            });
          },
          async down(knex) {
            await knex.schema.dropTable('user_table');
          },
        };`
      );

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
  });
});
