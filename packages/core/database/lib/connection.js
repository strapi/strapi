/* eslint-disable node/no-missing-require */
/* eslint-disable node/no-extraneous-require */
'use strict';

const knex = require('knex');

const SqliteClient = require('knex/lib/dialects/sqlite3/index');

const tryPackage = packageName => {
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
  return tryPackage('better-sqlite3') || tryPackage('@vscode/sqlite3') || tryPackage('sqlite3');
};

const getMysqlPackageName = () => {
  // Try the best mysql package
  return tryPackage('mysql2') || tryPackage('mysql');
};

const createConnection = config => {
  const knexConfig = { ...config };
  if (knexConfig.client === 'sqlite') {
    const sqlitePackageName = getSqlitePackageName();

    knexConfig.client = clientMap[sqlitePackageName];
  }

  if (knexConfig.client === 'mysql') {
    knexConfig.client = getMysqlPackageName();
  }

  const knexInstance = knex(knexConfig);

  return Object.assign(knexInstance, {
    getSchemaName() {
      return this.client.connectionSettings.schema;
    },
  });
};

module.exports = createConnection;
