'use strict';

const path = require('path');
const fse = require('fs-extra');

const errors = require('../../errors');
const { Dialect } = require('../dialect');
const SqliteSchmeaInspector = require('./schema-inspector');

class SqliteDialect extends Dialect {
  constructor(db) {
    super(db);

    this.schemaInspector = new SqliteSchmeaInspector(db);
  }

  canAlterConstraints() {
    return false;
  }

  async initialize() {
    await this.db.connection.raw('pragma foreign_keys = on');
  }

  // TODO: use strapi.dir
  configure() {
    this.db.config.connection.connection.filename = path.resolve(
      this.db.config.connection.connection.filename
    );

    const dbDir = path.dirname(this.db.config.connection.connection.filename);

    fse.ensureDirSync(dbDir);
  }

  transformErrors(error) {
    switch (error.errno) {
      case 19: {
        throw new errors.NotNullConstraint(); // TODO: extract column name
      }
      default: {
        super.transformErrors(error);
      }
    }
  }
}

module.exports = SqliteDialect;
