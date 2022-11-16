'use strict';

const { MARIADB, MYSQL } = require('../../utils/constants');

const SQL_QUERIES = {
  VERSION: `SELECT version()`,
};

class MysqlDatabaseInspector {
  constructor(db) {
    this.db = db;
  }

  async getInformation() {
    const [results] = await this.db.connection.raw(SQL_QUERIES.VERSION);
    const version = results[0]['version()'];

    const [versionNumber, databaseName] = version.split('-');
    const database = databaseName && databaseName.toLowerCase() === 'mariadb' ? MARIADB : MYSQL;

    return {
      database,
      version: versionNumber,
    };
  }
}

module.exports = MysqlDatabaseInspector;
