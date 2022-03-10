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
      if (field.type === 'DECIMAL' || field.type === 'NEWDECIMAL') {
        var value = field.string();
        return value === null ? null : Number(value);
      }

      if (field.type === 'TINY' && field.length === 1) {
        let value = field.string();
        return value ? value === '1' : null;
      }

      if (field.type === 'DATE') {
        return field.string();
      }

      return next();
    };
  }

  async initialize() {
    try {
      await this.db.connection.raw(`set session sql_require_primary_key = 0;`);
    } catch (err) {
      // Ignore error due to lack of session permissions
    }
  }

  async startSchemaUpdate() {
    try {
      await this.db.connection.raw(`set foreign_key_checks = 0;`);
      await this.db.connection.raw(`set session sql_require_primary_key = 0;`);
    } catch (err) {
      // Ignore error due to lack of session permissions
    }
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
