/* eslint-disable import/no-extraneous-dependencies */

'use strict';

const knex = require('knex');
const path = require('path');

const tryResolvePackage = (packageName) => {
  try {
    // Ensure that the user intends to use this package for consistency between environments
    const packageJSON = require(path.resolve('.', 'package.json'));
    if (!Object.keys(packageJSON?.dependencies).includes(packageName)) {
      return false;
    }

    require.resolve(packageName);
    return packageName;
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      return false;
    }
    throw error;
  }
};

/**
 * SQLite
 */
const SqliteClient = require('knex/lib/dialects/sqlite3/index');

class LegacySqliteClient extends SqliteClient {
  _driver() {
    return require('sqlite3');
  }
}

const getSqlitePackageName = () => {
  // allow forcing the package to use (mostly used for testing purposes)
  if (typeof process.env.SQLITE_PKG !== 'undefined') {
    return process.env.SQLITE_PKG;
  }

  // find the package based on availability
  return (
    tryResolvePackage('better-sqlite3') ||
    tryResolvePackage('@vscode/sqlite3') ||
    tryResolvePackage('sqlite3')
  );
};

/**
 * MySQL
 */
const getMysqlPackageName = () => {
  // allow forcing the package to use (mostly used for testing purposes)
  if (typeof process.env.STRAPI_MYSQL_PKG !== 'undefined') {
    return process.env.MYSQL_PKG;
  }

  // find the package based on availability
  return tryResolvePackage('mysql2') || tryResolvePackage('mysql');
};

/**
 * Create connection
 */

// map the best available package to the client name sent to knex that which will make it use that package
const clientMap = {
  'better-sqlite3': 'better-sqlite3',
  '@vscode/sqlite3': 'sqlite',
  sqlite3: LegacySqliteClient,
  mysql2: 'mysql2',
  mysql: 'mysql',
};

const createConnection = (config) => {
  const knexConfig = { ...config };

  if (knexConfig.client === 'sqlite') {
    knexConfig.client = clientMap[getSqlitePackageName()];
  }

  if (knexConfig.client === 'mysql') {
    knexConfig.client = clientMap[getMysqlPackageName()];
  }

  const knexInstance = knex(knexConfig);

  return Object.assign(knexInstance, {
    getSchemaName() {
      return this.client.connectionSettings.schema;
    },
  });
};

module.exports = createConnection;
