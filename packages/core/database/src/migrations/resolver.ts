import path from 'path';

import fse from 'fs-extra';

import { wrapTransaction } from './common';

import type { Context, Migration, MigrationResolver } from './common';

// TODO: check multiple commands in one sql statement
export const migrationResolver: MigrationResolver = ({ name, path: migrationPath, context }) => {
  const { db } = context;

  if (!migrationPath) {
    throw new Error(`Migration ${name} has no path`);
  }

  // if sql file run with knex raw
  if (migrationPath.match(/\.sql$/)) {
    const sql = fse.readFileSync(migrationPath, 'utf8');

    return {
      name,
      path: migrationPath,
      up: wrapTransaction(db)((knex) => knex.raw(sql)),
      async down() {
        throw new Error('Down migration is not supported for sql files');
      },
    };
  }

  let loadedMigration: Migration | { default: Migration };
  if (migrationPath.endsWith('.ts')) {
    // Keep the transform scoped to loading the migration so database consumers
    // do not receive a process-wide TypeScript require hook.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { register } = require('esbuild-register/dist/node');
    const { unregister } = register({ extensions: ['.ts'] });
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      loadedMigration = require(migrationPath);
    } finally {
      unregister();
    }
  } else {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    loadedMigration = require(migrationPath);
  }

  const migration = 'default' in loadedMigration ? loadedMigration.default : loadedMigration;
  return {
    name,
    path: migrationPath,
    up: wrapTransaction(db)(migration.up),
    down: wrapTransaction(db)(migration.down),
  };
};

export const resolveMigrationFiles = (filepaths: string[], context: Context) => {
  return filepaths.map((filepath) => {
    const name = path.basename(filepath);
    return migrationResolver({ name, path: filepath, context });
  });
};
