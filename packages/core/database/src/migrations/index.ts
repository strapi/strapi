import path from 'node:path';
import fse from 'fs-extra';
import { Umzug } from 'umzug';

import type { Resolver } from 'umzug';
import type { Knex } from 'knex';

import { createStorage } from './storage';

import type { Database } from '..';

export interface MigrationProvider {
  shouldRun(): Promise<boolean>;
  up(): Promise<void>;
  down(): Promise<void>;
}

type MigrationResolver = Resolver<{ db: Database }>;

const wrapTransaction = (db: Database) => (fn: (knex: Knex) => unknown) => () => {
  return db.connection.transaction((trx) => Promise.resolve(fn(trx)));
};

// TODO: check multiple commands in one sql statement
const migrationResolver: MigrationResolver = ({ name, path, context }) => {
  const { db } = context;

  if (!path) {
    throw new Error(`Migration ${name} has no path`);
  }

  // if sql file run with knex raw
  if (path.match(/\.sql$/)) {
    const sql = fse.readFileSync(path, 'utf8');

    return {
      name,
      up: wrapTransaction(db)((knex) => knex.raw(sql)),
      async down() {
        throw new Error('Down migration is not supported for sql files');
      },
    };
  }

  // NOTE: we can add some ts register if we want to handle ts migration files at some point
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const migration = require(path);
  return {
    name,
    up: wrapTransaction(db)(migration.up),
    down: wrapTransaction(db)(migration.down),
  };
};

const createUmzugProvider = (db: Database) => {
  const migrationDir = path.join(strapi.dirs.app.root, 'database/migrations');

  fse.ensureDirSync(migrationDir);

  return new Umzug({
    storage: createStorage({ db, tableName: 'strapi_migrations' }),
    logger: console,
    context: { db },
    migrations: {
      glob: ['*.{js,sql}', { cwd: migrationDir }],
      resolve: migrationResolver,
    },
  });
};

// NOTE: when needed => add internal migrations for core & plugins. How do we overlap them with users migrations ?

/**
 * Creates migrations provider
 * @type {import('.').createMigrationsProvider}
 */
export const createMigrationsProvider = (db: Database): MigrationProvider => {
  const migrations = createUmzugProvider(db);

  return {
    async shouldRun() {
      const pending = await migrations.pending();

      return pending.length > 0 && db.config?.settings?.runMigrations === true;
    },
    async up() {
      await migrations.up();
    },
    async down() {
      await migrations.down();
    },
  };
};
