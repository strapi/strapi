'use strict';

const { POSTGRES, UNKNOWN } = require('../../utils/constants');

const SQL_QUERIES = {
  VERSION: `SELECT current_setting('server_version') as version`,
};

class PostgresqlDatabaseInspector {
  constructor(db) {
    this.db = db;
  }

  async getInformation() {
    let version;
    try {
      const { rows } = await this.db.connection.raw(SQL_QUERIES.VERSION);
      version = rows[0].version.split(' ')[0];
    } catch (e) {
      version = UNKNOWN;
      strapi.log.warn(`Database version couldn't be retrieved: ${e.message}`);
    }

    return {
      database: POSTGRES,
      version,
    };
  }
}

module.exports = PostgresqlDatabaseInspector;
