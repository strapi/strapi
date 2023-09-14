/* eslint-disable import/no-extraneous-dependencies */

'use strict';

const knex = require('knex');

const SqliteClient = require('knex/lib/dialects/sqlite3/index');

const trySqlitePackage = (packageName) => {
  try {
    require.resolve(packageName);
    return packageName;
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      return false;
    }
    throw error;
  }
};
class LegacySqliteClient extends SqliteClient {
  _driver() {
    return require('sqlite3');
  }
}

const clientMap = {
  'better-sqlite3': 'better-sqlite3',
  '@vscode/sqlite3': 'sqlite',
  sqlite3: LegacySqliteClient,
};

const getSqlitePackageName = () => {
  // NOTE: allow forcing the package to use (mostly used for testing purposes)
  if (typeof process.env.SQLITE_PKG !== 'undefined') {
    return process.env.SQLITE_PKG;
  }

  // NOTE: this tries to find the best sqlite module possible to use
  // while keeping retro compatibility
  return (
    trySqlitePackage('better-sqlite3') ||
    trySqlitePackage('@vscode/sqlite3') ||
    trySqlitePackage('sqlite3')
  );
};

const createConnection = (config, onAfterCreate = undefined) => {
  const knexConfig = { ...config };
  if (knexConfig.client === 'sqlite') {
    const sqlitePackageName = getSqlitePackageName();

    knexConfig.client = clientMap[sqlitePackageName];
  }

  // initialization code to run upon opening a new connection
  // In theory this should be required but there may be cases where it's not desired
  if (onAfterCreate) {
    knexConfig.pool = knexConfig.pool || {};
    // if the user has set their own afterCreate in config, we will replace it and call it
    const userAfterCreate = knexConfig.pool?.afterCreate;
    knexConfig.pool.afterCreate = (conn, done) => {
      onAfterCreate(conn, (err, conn) => {
        if (err) {
          return done(err, conn);
        }
        if (userAfterCreate) {
          return userAfterCreate(conn, done);
        }
        return done(null, conn);
      });
    };
  }

  const knexInstance = knex(knexConfig);

  return Object.assign(knexInstance, {
    getSchemaName() {
      return this.client.connectionSettings.schema;
    },
  });
};

module.exports = createConnection;
