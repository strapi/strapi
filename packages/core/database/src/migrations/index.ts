import { createUserMigrationProvider } from './users';
import { createInternalMigrationProvider } from './internal';
import { createPostSyncMigrationProvider } from './post-sync';
import { createMigrationFileBuilder } from './file-builder';

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
  const postSyncProvider = createPostSyncMigrationProvider(db);
  const preSyncProviders = [userProvider, internalProvider];

  return {
    providers: {
      internal: internalProvider,
      postSync: postSyncProvider,
    },
    createFileBuilder() {
      return createMigrationFileBuilder({ db });
    },
    async shouldRun() {
      const shouldRunResponses = await Promise.all(
        preSyncProviders.map((provider) => provider.shouldRun())
      );

      return shouldRunResponses.some((shouldRun) => shouldRun);
    },
    async up() {
      for (const provider of preSyncProviders) {
        if (await provider.shouldRun()) {
          await provider.up();
        }
      }
    },
    async down() {
      for (const provider of preSyncProviders) {
        if (await provider.shouldRun()) {
          await provider.down();
        }
      }
    },
  };
};
