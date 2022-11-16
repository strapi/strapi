'use strict';

const errors = require('../../errors');
const { Dialect } = require('../dialect');
const PostgresqlSchemaInspector = require('./schema-inspector');
const PostgresqlDatabaseInspector = require('./database-inspector');

class PostgresDialect extends Dialect {
  constructor(db) {
    super(db);

    this.schemaInspector = new PostgresqlSchemaInspector(db);
    this.databaseInspector = new PostgresqlDatabaseInspector(db);
    this.info = null;
  }

  useReturning() {
    return true;
  }

  getInfo() {
    return this.info;
  }

  async initialize() {
    this.db.connection.client.driver.types.setTypeParser(1082, 'text', (v) => v); // Don't cast DATE string to Date()
    this.db.connection.client.driver.types.setTypeParser(1700, 'text', parseFloat);
    this.info = await this.databaseInspector.getInformation();
  }

  usesForeignKeys() {
    return true;
  }

  getSqlType(type) {
    switch (type) {
      case 'timestamp': {
        return 'datetime';
      }
      default: {
        return type;
      }
    }
  }

  transformErrors(error) {
    switch (error.code) {
      case '23502': {
        throw new errors.NotNullError({ column: error.column });
      }
      default: {
        super.transformErrors(error);
      }
    }
  }
}

module.exports = PostgresDialect;
