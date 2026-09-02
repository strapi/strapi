import {
  createFileMigrationProvider,
  resolvePostSyncMigrationsDir,
} from './file-migration-provider';

import type { UserMigrationProvider } from './common';
import type { Database } from '..';

const POST_SYNC_MIGRATIONS_TABLE = 'strapi_migrations_post';

export const createPostSyncMigrationProvider = (db: Database): UserMigrationProvider => {
  return createFileMigrationProvider(db, {
    dir: resolvePostSyncMigrationsDir(db),
    tableName: POST_SYNC_MIGRATIONS_TABLE,
  });
};
