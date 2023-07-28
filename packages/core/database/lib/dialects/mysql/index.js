'use strict';

const semver = require('semver');

const { Dialect } = require('../dialect');
const MysqlSchemaInspector = require('./schema-inspector');
const MysqlDatabaseInspector = require('./database-inspector');
const { MYSQL } = require('./constants');

class MysqlDialect extends Dialect {
  constructor(db) {
    super(db);

    this.schemaInspector = new MysqlSchemaInspector(db);
    this.databaseInspector = new MysqlDatabaseInspector(db);
    this.info = null;
  }

  configure() {
    this.db.config.connection.connection.supportBigNumbers = true;
    // Only allow bigNumberStrings option set to be true if no connection option passed
    // Otherwise bigNumberStrings option should be allowed to used from DB config
    if (this.db.config.connection.connection.bigNumberStrings === undefined) {
      this.db.config.connection.connection.bigNumberStrings = true;
    }
    this.db.config.connection.connection.typeCast = (field, next) => {
      if (field.type === 'DECIMAL' || field.type === 'NEWDECIMAL') {
        const value = field.string();
        return value === null ? null : Number(value);
      }

      if (field.type === 'TINY' && field.length === 1) {
        const value = field.string();
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

    this.info = await this.databaseInspector.getInformation();
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

  supportsWindowFunctions() {
    const isMysqlDB = !this.info.database || this.info.database === MYSQL;
    const isBeforeV8 = !semver.valid(this.info.version) || semver.lt(this.info.version, '8.0.0');

    if (isMysqlDB && isBeforeV8) {
      return false;
    }

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
