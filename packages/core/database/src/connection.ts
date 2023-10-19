import knex from 'knex';
import type { Knex } from 'knex';
import SqliteClient from 'knex/lib/dialects/sqlite3/index';

class LegacySqliteClient extends SqliteClient {
  _driver() {
    /* eslint-disable-next-line import/no-extraneous-dependencies */
    return require('sqlite3');
  }
}

const clientMap = {
  'better-sqlite3': 'better-sqlite3',
  '@vscode/sqlite3': 'sqlite',
  sqlite3: LegacySqliteClient,
} as const;

type ClientKey = keyof typeof clientMap;

const trySqlitePackage = (packageName: ClientKey): ClientKey | false => {
  try {
    require.resolve(packageName);
    return packageName;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'MODULE_NOT_FOUND') {
      return false;
    }
    throw error;
  }
};

const getSqlitePackageName = (): ClientKey => {
  // NOTE: allow forcing the package to use (mostly used for testing purposes)
  if (typeof process.env.SQLITE_PKG !== 'undefined') {
    return process.env.SQLITE_PKG as ClientKey;
  }

  // NOTE: this tries to find the best sqlite module possible to use
  // while keeping retro compatibility
  const matchingPackage: ClientKey | false =
    trySqlitePackage('better-sqlite3') ||
    trySqlitePackage('@vscode/sqlite3') ||
    trySqlitePackage('sqlite3');

  if (!matchingPackage) {
    throw new Error('No sqlite package found');
  }

  return matchingPackage;
};

export const createConnection = (config: Knex.Config, mergeWithUserConfig?: Knex.Config) => {
  const knexConfig = { ...config };
  if (knexConfig.client === 'sqlite') {
    const sqlitePackageName = getSqlitePackageName();

    knexConfig.client = clientMap[sqlitePackageName] as Knex.Config['client'];
  }

  // initialization code to run upon opening a new connection
  // In theory this should be required but there may be cases where it's not desired
  if (mergeWithUserConfig?.pool?.afterCreate) {
    const strapiAfterCreate = mergeWithUserConfig.pool.afterCreate;
    knexConfig.pool = knexConfig.pool || {};
    // if the user has set their own afterCreate in config, we will replace it and call it
    const userAfterCreate = knexConfig.pool?.afterCreate;
    knexConfig.pool.afterCreate = (
      conn: unknown,
      done: (err: Error | null | undefined, connection: any) => void
    ) => {
      strapiAfterCreate(conn, (err: Error | null | undefined, nativeConn: any) => {
        if (err) {
          return done(err, nativeConn);
        }
        if (userAfterCreate) {
          return userAfterCreate(nativeConn, done);
        }
        return done(null, nativeConn);
      });
    };
  }

  return knex(knexConfig);
};
