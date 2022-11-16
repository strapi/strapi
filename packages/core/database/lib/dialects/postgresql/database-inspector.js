'use strict';

const { POSTGRES } = require('../../utils/constants');

const SQL_QUERIES = {
  VERSION: `SELECT current_setting('server_version')`,
};

class PostgresqlDatabaseInspector {
  constructor(db) {
    this.db = db;
  }

  async getInformation() {
    const { rows } = await this.db.connection.raw(SQL_QUERIES.VERSION);
    const version = rows[0].current_setting;

    return {
      database: POSTGRES,
      version: version.split(' ')[0],
    };
  }
}

module.exports = PostgresqlDatabaseInspector;
