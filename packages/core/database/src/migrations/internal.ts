import { Umzug } from 'umzug';

import { wrapTransaction } from './common';
import { internalMigrations } from './internal-migrations';
import { createStorage } from './storage';
import { transformLogMessage } from './logger';

import type { InternalMigrationProvider, Migration } from './common';
import type { Database } from '..';

export const createInternalMigrationProvider = (db: Database): InternalMigrationProvider => {
  const context = { db };
  const migrations: Migration[] = [...internalMigrations];

  const umzugProvider = new Umzug({
    storage: createStorage({ db, tableName: 'strapi_migrations_internal' }),
    logger: {
      info(message) {
        // NOTE: only log internal migration in debug mode
        db.logger.debug(transformLogMessage('info', message));
      },
      warn(message) {
        db.logger.warn(transformLogMessage('warn', message));
      },
      error(message) {
        db.logger.error(transformLogMessage('error', message));
      },
      debug(message) {
        db.logger.debug(transformLogMessage('debug', message));
      },
    },
    context,
    migrations: () =>
      migrations.map((migration) => {
        return {
          name: migration.name,
          up: wrapTransaction(context.db)(migration.up),
          down: wrapTransaction(context.db)(migration.down),
        };
      }),
  });

  return {
    async register(migration: Migration) {
      migrations.push(migration);
    },
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
