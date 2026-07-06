import path from 'node:path';

import fse from 'fs-extra';
import type { Umzug } from 'umzug';

import { createStorage } from './storage';
import { wrapTransaction } from './common';
import { transformLogMessage } from './logger';

import type { MigrationResolver, UserMigrationProvider } from './common';
import type { Database } from '..';

// TODO: check multiple commands in one sql statement
const migrationResolver: MigrationResolver = ({ name, path: migrationPath, context }) => {
  const { db } = context;

  if (!migrationPath) {
    throw new Error(`Migration ${name} has no path`);
  }

  if (migrationPath.match(/\.sql$/)) {
    const sql = fse.readFileSync(migrationPath, 'utf8');

    return {
      name,
      up: wrapTransaction(db)((knex) => knex.raw(sql)),
      async down() {
        throw new Error('Down migration is not supported for sql files');
      },
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const migration = require(migrationPath);
  return {
    name,
    up: wrapTransaction(db)(migration.up),
    down: wrapTransaction(db)(migration.down),
  };
};

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

  let lazyProvider: Umzug<typeof context> | undefined;
  const provider = (): Umzug<typeof context> => {
    if (lazyProvider) return lazyProvider;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Umzug: UmzugCtor } = require('umzug') as typeof import('umzug');
    lazyProvider = new UmzugCtor({
      storage: createStorage({ db, tableName }),
      logger: {
        info(message) {
          db.logger.info(transformLogMessage('info', message));
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
      migrations: {
        glob: ['*.{js,sql}', { cwd: dir }],
        resolve: migrationResolver,
      },
    });
    return lazyProvider;
  };

  return {
    async shouldRun() {
      const pendingMigrations = await provider().pending();
      return pendingMigrations.length > 0 && db.config?.settings?.runMigrations === true;
    },
    async up() {
      await provider().up();
    },
    async down() {
      await provider().down();
    },
  };
};

export const resolvePostSyncMigrationsDir = (db: Database): string => {
  const { dir, postDir } = db.config.settings.migrations;

  return postDir ?? path.join(path.dirname(dir), 'migrations-post');
};
