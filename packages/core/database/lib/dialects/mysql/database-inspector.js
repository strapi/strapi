'use strict';

const { MARIADB, MYSQL } = require('./constants');

const SQL_QUERIES = {
  VERSION: `SELECT version() as version`,
};

class MysqlDatabaseInspector {
  constructor(db) {
    this.db = db;
  }

  async getInformation() {
    let database;
    let versionNumber;
    try {
      const [results] = await this.db.connection.raw(SQL_QUERIES.VERSION);
      const versionSplit = results[0].version.split('-');
      const databaseName = versionSplit[1];
      versionNumber = versionSplit[0];
      database = databaseName && databaseName.toLowerCase() === 'mariadb' ? MARIADB : MYSQL;
    } catch (e) {
      return {
        database: null,
        version: null,
      };
    }

    return {
      database,
      version: versionNumber,
    };
  }
}

module.exports = MysqlDatabaseInspector;
