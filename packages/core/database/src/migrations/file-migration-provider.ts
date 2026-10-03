import path from 'node:path';

import fse from 'fs-extra';

import { discoverMigrationFiles } from './discover';
import { createMigrationRunner } from './runner';
import { resolveMigrationFiles } from './resolver';
import { createStorage } from './storage';
import { transformLogMessage } from './logger';

import type { UserMigrationProvider } from './common';
import type { Database } from '..';

export interface FileMigrationProviderOptions {
  dir: string;
  tableName: string;
}

export const createFileMigrationProvider = (
  db: Database,
  { dir, tableName }: FileMigrationProviderOptions
): UserMigrationProvider => {
  fse.ensureDirSync(dir);

  const context = { db };

  const runner = createMigrationRunner({
    storage: createStorage({ db, tableName }),
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

export const resolvePostSyncMigrationsDir = (db: Database): string => {
  const { dir, postDir } = db.config.settings.migrations;

  return postDir ?? path.join(path.dirname(dir), 'migrations-post');
};
