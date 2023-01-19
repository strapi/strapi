'use strict';

const errors = require('../../errors');
const { Dialect } = require('../dialect');
const CockroachdbSchemaInspector = require('./schema-inspector');

class CockroachDialect extends Dialect {
  constructor(db) {
    super(db);

    this.schemaInspector = new CockroachdbSchemaInspector(db);
  }

  useReturning() {
    return true;
  }

  initialize() {
    this.db.connection.client.driver.types.setTypeParser(
      this.db.connection.client.driver.types.builtins.DATE,
      'text',
      (v) => v
    ); // Don't cast DATE string to Date()
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
      case 'integer': {
        return 'bigInteger';
      }
      default: {
        return type;
      }
    }
  }

  transformErrors(error) {
    switch (error.code) {
      case '23502': {
        throw new errors.NotNullConstraint({ column: error.column });
      }
      default: {
        super.transformErrors(error);
      }
    }
  }
}

module.exports = CockroachDialect;
