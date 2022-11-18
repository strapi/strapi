'use strict';

const { MARIADB, MYSQL, UNKNOWN } = require('../../utils/constants');

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
      throw new Error('oups');
    } catch (e) {
      database = UNKNOWN;
      versionNumber = UNKNOWN;
      strapi.log.warn(`Database version couldn't be retrieved: ${e.message}`);
    }

    return {
      database,
      version: versionNumber,
    };
  }
}

module.exports = MysqlDatabaseInspector;
