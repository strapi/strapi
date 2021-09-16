'use strict';

const { Dialect } = require('../dialect');
const MysqlSchemaInspector = require('./schema-inspector');

class MysqlDialect extends Dialect {
  constructor(db) {
    super(db);

    this.schemaInspector = new MysqlSchemaInspector(db);
  }

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

  async startSchemaUpdate() {
    await this.db.connection.raw(`set foreign_key_checks = 0;`);
  }

  async endSchemaUpdate() {
    await this.db.connection.raw(`set foreign_key_checks = 1;`);
  }

  supportsUnsigned() {
    return true;
  }

  usesForeignKeys() {
    return true;
  }

  transformErrors(error) {
    super.transformErrors(error);
  }
}

module.exports = MysqlDialect;
