import { createFileMigrationProvider } from './file-migration-provider';

import type { UserMigrationProvider } from './common';
import type { Database } from '..';

export const createUserMigrationProvider = (db: Database): UserMigrationProvider => {
  return createFileMigrationProvider(db, {
    dir: db.config.settings.migrations.dir,
    tableName: 'strapi_migrations',
  });
};
