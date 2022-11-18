'use strict';

const { SQLITE, UNKNOWN } = require('../../utils/constants');

const SQL_QUERIES = {
  VERSION: `SELECT sqlite_version() as version`,
};

class SqliteDatabaseInspector {
  constructor(db) {
    this.db = db;
  }

  async getInformation() {
    let version;
    try {
      const results = await this.db.connection.raw(SQL_QUERIES.VERSION);
      version = results[0].version;
    } catch (e) {
      version = UNKNOWN;
      strapi.log.warn(`Database version couldn't be retrieved: ${e.message}`);
    }
    return {
      database: SQLITE,
      version,
    };
  }
}

module.exports = SqliteDatabaseInspector;
