'use strict';

const { SQLITE } = require('../../utils/constants');

const SQL_QUERIES = {
  VERSION: `SELECT sqlite_version()`,
};

class SqliteDatabaseInspector {
  constructor(db) {
    this.db = db;
  }

  async getInformation() {
    const results = await this.db.connection.raw(SQL_QUERIES.VERSION);
    const version = results[0]['sqlite_version()'];

    return {
      database: SQLITE,
      version,
    };
  }
}

module.exports = SqliteDatabaseInspector;
