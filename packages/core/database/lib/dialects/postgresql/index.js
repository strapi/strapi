'use strict';

const errors = require('../../errors');
const { Dialect } = require('../dialect');
const PostgresqlSchemaInspector = require('./schema-inspector');

class PostgresDialect extends Dialect {
  constructor(db) {
    super(db);

    this.schemaInspector = new PostgresqlSchemaInspector(db);
  }

  useReturning() {
    return true;
  }

  async initialize() {
    // Don't cast DATE string to Date()
    this.db.connection.client.driver.types.setTypeParser(
      this.db.connection.client.driver.types.builtins.DATE,
      'text',
      (v) => v
    );
    // Don't parse JSONB automatically
    this.db.connection.client.driver.types.setTypeParser(
      this.db.connection.client.driver.types.builtins.JSONB,
      'text',
      (v) => v
    );
    this.db.connection.client.driver.types.setTypeParser(
      this.db.connection.client.driver.types.builtins.NUMERIC,
      'text',
      parseFloat
    );
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
