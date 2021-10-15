'use strict';

/**
 * @typedef {import('@strapi/database').Database} Database
 */

const { Dialect } = require('../dialect');
const MysqlSchemaInspector = require('./schema-inspector');

class MysqlDialect extends Dialect {
  /**
   * @param {Database} db
   */
  constructor(db) {
    super(db);

    this.schemaInspector = new MysqlSchemaInspector(db);
  }

  configure() {
    this.db.config.connection.connection.supportBigNumbers = true;
    this.db.config.connection.connection.bigNumberStrings = true;
    this.db.config.connection.connection.typeCast = /**
     * @param {any} field
     * @param {() => void} next
     **/ (field, next) => {
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

  /**
   * @param {Error | { message?: string }} error
   */
  transformErrors(error) {
    super.transformErrors(error);
  }
}

module.exports = MysqlDialect;
