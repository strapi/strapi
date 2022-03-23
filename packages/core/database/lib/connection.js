/* eslint-disable node/no-missing-require */
/* eslint-disable node/no-extraneous-require */
'use strict';

const knex = require('knex');

const SqliteClient = require('knex/lib/dialects/sqlite3/index');

const tryBetterSqlite3Client = config => {
  try {
    require.resolve('better-sqlite3');
    config.client = 'better-sqlite3';
    return true;
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      return false;
    }
    throw error;
  }
};

const tryVscodeSqlite3Client = () => {
  try {
    require.resolve('@vscode/sqlite3');
    return true;
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      return false;
    }
    throw error;
  }
};

const tryLegacySqlite3Client = config => {
  try {
    require.resolve('sqlite3');
    config.client = class MySqliteClient extends SqliteClient {
      _driver() {
        return require('sqlite3');
      }
    };

    return true;
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      return false;
    }
    throw error;
  }
};

const createConnection = config => {
  const knexConfig = { ...config };
  if (knexConfig.client === 'sqlite') {
    // NOTE: this tries to find the best sqlite module possible to use
    // while keeping retro compatibiity
    tryBetterSqlite3Client(knexConfig) ||
      tryVscodeSqlite3Client(knexConfig) ||
      tryLegacySqlite3Client(knexConfig);
  }

  const knexInstance = knex(knexConfig);

  return Object.assign(knexInstance, {
    getSchemaName() {
      return this.client.connectionSettings.schema;
    },
  });
};

module.exports = createConnection;
