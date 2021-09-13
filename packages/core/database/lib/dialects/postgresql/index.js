'use strict';

const { Dialect } = require('../dialect');
const errors = require('../../errors');

class PostgresDialect extends Dialect {
  useReturning() {
    return true;
  }

  initialize() {
    this.db.connection.client.driver.types.setTypeParser(1700, 'text', parseFloat);
  }

  usesForeignKeys() {
    return false;
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

module.exports = PostgresDialect;
