/* eslint-disable import/no-extraneous-dependencies */

'use strict';

const knex = require('knex');

const tryResolvePackage = (packageName) => {
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
  // NOTE: allow forcing the package to use (mostly used for testing purposes)
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
  // NOTE: allow forcing the package to use (mostly used for testing purposes)
  if (typeof process.env.MYSQL_PKG !== 'undefined') {
    return process.env.MYSQL_PKG;
  }

  // find the package based on availability
  return tryResolvePackage('mysql') || tryResolvePackage('mysql2');
};

/**
 * Create connection
 */

// map the package we're using to the client name that causes knex to use that package
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

    /**
     * NOTE: connectionString is deprecated in mysql2 but is included in Strapi db configuration
     * If it is unused, we delete it to suppress the deprecation warning
     * If the user is attempting to use it, keep it to allow the error to display
     * */
    if (knexConfig.client === 'mysql2' && !knexConfig.connection.connectionString) {
      delete knexConfig.connection.connectionString;
    }
  }

  const knexInstance = knex(knexConfig);

  return Object.assign(knexInstance, {
    getSchemaName() {
      return this.client.connectionSettings.schema;
    },
  });
};

module.exports = createConnection;
