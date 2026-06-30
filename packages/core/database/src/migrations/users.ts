import path from 'path';

import fse from 'fs-extra';

import { discoverMigrationFiles } from './discover';
import { createMigrationRunner } from './runner';
import { resolveMigrationFiles } from './resolver';
import { createStorage } from './storage';
import { transformLogMessage } from './logger';

import type { UserMigrationProvider } from './common';
import type { Database } from '..';

export const createUserMigrationProvider = (db: Database): UserMigrationProvider => {
  const dir = db.config.settings.migrations.dir;

  fse.ensureDirSync(dir);

  const context = { db };

  const runner = createMigrationRunner({
    storage: createStorage({ db, tableName: 'strapi_migrations' }),
    logger: {
      info(message) {
        db.logger.info(transformLogMessage('info', message));
      },
    },
    async getMigrations() {
      const filepaths = discoverMigrationFiles(path.resolve(dir));
      return resolveMigrationFiles(filepaths, context);
    },
  });

  return {
    async shouldRun() {
      const pendingMigrations = await runner.pending();
      return pendingMigrations.length > 0 && db.config?.settings?.runMigrations === true;
    },
    async up() {
      await runner.up();
    },
    async down() {
      await runner.down();
    },
  };
};
