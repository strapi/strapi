import knex from 'knex';

import { createInternalMigrationProvider } from '../internal';
import { internalMigrations } from '../internal-migrations';
import { createStorage } from '../storage';

/**
 * Belt-and-suspenders: after umzug → internal runner, deployments that already
 * have every internal migration name in `strapi_migrations_internal` must not
 * re-run those `up` bodies. Inverse: empty storage still runs and records them.
 *
 * Real migration `up` functions are spied (never executed) so empty-sqlite does
 * not need Strapi metadata/tables those migrations expect.
 */

const createTestDatabase = () => {
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
        runMigrations: true,
        migrations: { dir: '' },
      },
    },
  };

  return { db: db as any, sqlite };
};

describe('internal migration upgrade simulation', () => {
  const migrationNames = internalMigrations.map((migration) => migration.name);
  let upSpies: jest.SpyInstance[];

  beforeEach(() => {
    expect(internalMigrations.length).toBeGreaterThan(0);

    upSpies = internalMigrations.map((migration) =>
      jest.spyOn(migration, 'up').mockResolvedValue(undefined)
    );
  });

  afterEach(() => {
    upSpies.forEach((spy) => spy.mockRestore());
  });

  it('does not re-run internal migrations when strapi_migrations_internal already has every name', async () => {
    const { db, sqlite } = createTestDatabase();
    const storage = createStorage({ db, tableName: 'strapi_migrations_internal' });

    await storage.executed();
    for (const name of migrationNames) {
      await storage.logMigration({ name });
    }

    const provider = createInternalMigrationProvider(db);

    await expect(provider.shouldRun()).resolves.toBe(false);
    await provider.up();

    for (const spy of upSpies) {
      expect(spy).not.toHaveBeenCalled();
    }

    expect(await sqlite('strapi_migrations_internal').orderBy('name').select('name')).toEqual(
      [...migrationNames].sort().map((name) => ({ name }))
    );

    await sqlite.destroy();
  });

  it('runs all internal migrations and records their names on an empty storage table', async () => {
    const { db, sqlite } = createTestDatabase();
    const provider = createInternalMigrationProvider(db);

    await expect(provider.shouldRun()).resolves.toBe(true);
    await provider.up();

    for (const spy of upSpies) {
      expect(spy).toHaveBeenCalledTimes(1);
    }

    expect(await sqlite('strapi_migrations_internal').orderBy('id').select('name')).toEqual(
      migrationNames.map((name) => ({ name }))
    );
    await expect(provider.shouldRun()).resolves.toBe(false);

    await sqlite.destroy();
  });

  it('skips already-logged internal migrations and runs only pending ones', async () => {
    expect(migrationNames.length).toBeGreaterThan(1);

    const { db, sqlite } = createTestDatabase();
    const storage = createStorage({ db, tableName: 'strapi_migrations_internal' });
    const alreadyLogged = migrationNames.slice(0, -1);
    const pendingName = migrationNames[migrationNames.length - 1];

    await storage.executed();
    for (const name of alreadyLogged) {
      await storage.logMigration({ name });
    }

    const provider = createInternalMigrationProvider(db);

    await expect(provider.shouldRun()).resolves.toBe(true);
    await provider.up();

    upSpies.forEach((spy, index) => {
      if (index < alreadyLogged.length) {
        expect(spy).not.toHaveBeenCalled();
      } else {
        expect(spy).toHaveBeenCalledTimes(1);
      }
    });

    expect(await sqlite('strapi_migrations_internal').orderBy('id').select('name')).toEqual(
      migrationNames.map((name) => ({ name }))
    );
    expect(upSpies[migrationNames.indexOf(pendingName)]).toHaveBeenCalledTimes(1);
    await expect(provider.shouldRun()).resolves.toBe(false);

    await sqlite.destroy();
  });
});
