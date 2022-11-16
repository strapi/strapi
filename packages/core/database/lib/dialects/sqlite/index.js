'use strict';

const path = require('path');
const fse = require('fs-extra');

const errors = require('../../errors');
const { Dialect } = require('../dialect');
const SqliteSchemaInspector = require('./schema-inspector');
const SqliteDatabaseInspector = require('./database-inspector');

class SqliteDialect extends Dialect {
  constructor(db) {
    super(db);

    this.schemaInspector = new SqliteSchemaInspector(db);
    this.databaseInspector = new SqliteDatabaseInspector(db);
    this.info = null;
  }

  configure() {
    this.db.config.connection.connection.filename = path.resolve(
      this.db.config.connection.connection.filename
    );

    const dbDir = path.dirname(this.db.config.connection.connection.filename);

    fse.ensureDirSync(dbDir);
  }

  getInfo() {
    return this.info;
  }

  useReturning() {
    return true;
  }

  async initialize() {
    await this.db.connection.raw('pragma foreign_keys = on');
    this.info = await this.databaseInspector.getInformation();
  }

  canAlterConstraints() {
    return false;
  }

  getSqlType(type) {
    switch (type) {
      case 'enum': {
        return 'text';
      }
      case 'double':
      case 'decimal': {
        return 'float';
      }
      case 'timestamp': {
        return 'datetime';
      }
      default: {
        return type;
      }
    }
  }

  async startSchemaUpdate() {
    await this.db.connection.raw(`pragma foreign_keys = off`);
  }

  async endSchemaUpdate() {
    await this.db.connection.raw(`pragma foreign_keys = on`);
  }

  transformErrors(error) {
    switch (error.errno) {
      case 19: {
        throw new errors.NotNullError(); // TODO: extract column name
      }
      default: {
        super.transformErrors(error);
      }
    }
  }

  canAddIncrements() {
    return false;
  }
}

module.exports = SqliteDialect;
