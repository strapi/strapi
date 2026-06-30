import { wrapTransaction } from './common';
import { createMigrationRunner } from './runner';
import { internalMigrations } from './internal-migrations';
import { createStorage } from './storage';
import { transformLogMessage } from './logger';

import type { InternalMigrationProvider, Migration } from './common';
import type { Database } from '..';

export const createInternalMigrationProvider = (db: Database): InternalMigrationProvider => {
  const context = { db };
  const migrations: Migration[] = [...internalMigrations];

  const runner = createMigrationRunner({
    storage: createStorage({ db, tableName: 'strapi_migrations_internal' }),
    logger: {
      info(message) {
        // NOTE: only log internal migration in debug mode
        db.logger.debug(transformLogMessage('info', message));
      },
    },
    getMigrations: async () =>
      migrations.map((migration) => ({
        name: migration.name,
        up: wrapTransaction(context.db)(migration.up),
        down: wrapTransaction(context.db)(migration.down),
      })),
  });

  return {
    async register(migration: Migration) {
      migrations.push(migration);
    },
    async shouldRun() {
      const pendingMigrations = await runner.pending();
      return pendingMigrations.length > 0;
    },
    async up() {
      await runner.up();
    },
    async down() {
      await runner.down();
    },
  };
};
