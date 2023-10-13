import { Umzug } from 'umzug';

import { wrapTransaction } from './common';
import { internalMigrations } from './internal-migrations';
import { createStorage } from './storage';

import type { MigrationProvider } from './common';
import type { Database } from '..';

export const createInternalMigrationProvider = (db: Database): MigrationProvider => {
  const context = { db };

  const umzugProvider = new Umzug({
    storage: createStorage({ db, tableName: 'strapi_migrations_internal' }),
    logger: console,
    context,
    migrations: internalMigrations.map((migration) => {
      return {
        name: migration.name,
        up: wrapTransaction(context.db)(migration.up),
        down: wrapTransaction(context.db)(migration.down),
      };
    }),
  });

  return {
    async shouldRun() {
      const pendingMigrations = await umzugProvider.pending();
      return pendingMigrations.length > 0;
    },
    async up() {
      await umzugProvider.up();
    },
    async down() {
      await umzugProvider.down();
    },
  };
};
