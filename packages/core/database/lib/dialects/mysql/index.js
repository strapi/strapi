'use strict';

const { Dialect } = require('../dialect');

class MysqlDialect extends Dialect {
  configure() {
    this.db.config.connection.connection.supportBigNumbers = true;
    this.db.config.connection.connection.bigNumberStrings = true;
    this.db.config.connection.connection.typeCast = (field, next) => {
      if (field.type == 'DECIMAL' || field.type === 'NEWDECIMAL') {
        var value = field.string();
        return value === null ? null : Number(value);
      }

      if (field.type == 'TINY' && field.length == 1) {
        let value = field.string();
        return value ? value == '1' : null;
      }
      return next();
    };
  }

  usesForeignKeys() {
    return false;
  }

  transformErrors(error) {
    super.transformErrors(error);
  }
}

module.exports = MysqlDialect;
