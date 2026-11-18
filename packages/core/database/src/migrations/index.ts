import type { Knex } from 'knex';

import { createUserMigrationProvider } from './users';
import { createInternalMigrationProvider } from './internal';
import { createMigrationFileBuilder } from './file-builder';
import { createDocumentWriteLocks } from './internal-migrations/5.0.0-07-document-write-locks';

import type { MigrationProvider } from './common';
import type { Database } from '..';

export type { MigrationProvider, Migration } from './common';
export type {
  AttributeRenamesOperation,
  BuiltMigrationFile,
  MigrationFileBuilder,
  MigrationFileFormat,
  MigrationFileOperation,
} from './file-builder';

export const createMigrationsProvider = (db: Database): MigrationProvider => {
  const userProvider = createUserMigrationProvider(db);
  const internalProvider = createInternalMigrationProvider(db);
  const providers = [userProvider, internalProvider];

  return {
    providers: {
      internal: internalProvider,
    },
    createFileBuilder() {
      return createMigrationFileBuilder({ db });
    },
    async shouldRun() {
      const shouldRunResponses = await Promise.all(
        providers.map((provider) => provider.shouldRun())
      );

      return shouldRunResponses.some((shouldRun) => shouldRun);
    },
    async up() {
      // User migrations run before internal ones, and a user migration may
      // update a document. The MySQL lock table has to exist before that, or
      // the insert into the missing table aborts boot and the migration never
      // gets recorded. The internal migration still records itself and no-ops
      // once the table is there.
      if (db.dialect?.client === 'mysql') {
        await createDocumentWriteLocks.up(db.connection as Knex.Transaction, db);
      }

      for (const provider of providers) {
        if (await provider.shouldRun()) {
          await provider.up();
        }
      }
    },
    async down() {
      for (const provider of providers) {
        if (await provider.shouldRun()) {
          await provider.down();
        }
      }
    },
  };
};
