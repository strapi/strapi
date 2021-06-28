'use strict';

const errors = require('../errors');

class Dialect {
  constructor(db) {
    this.db = db;
  }

  useReturning() {
    return false;
  }

  processResult(r) {
    return r;
  }

  // TODO: pass query info to display some more metadata
  transformErrors(error) {
    throw error;
  }
}
class PostgresDialect extends Dialect {
  useReturning() {
    return true;
  }

  initialize() {
    this.db.connection.client.types.setTypeParser(1700, 'text', parseFloat);
  }

  transformErrors(error) {
    switch (error.code) {
      case '23502': {
        throw new errors.NotNullConstraint({ column: error.column });
      }
      default: {
        throw error;
      }
    }
  }
}

class MysqlDialect extends Dialect {
  initialize() {
    this.db.connection.supportBigNumbers = true;
    this.db.connection.bigNumberStrings = true;
    this.db.connection.typeCast = (field, next) => {
      if (field.type == 'DECIMAL' || field.type === 'NEWDECIMAL') {
        var value = field.string();
        return value === null ? null : Number(value);
      }

      if (field.type == 'TINY' && field.length == 1) {
        console.log('coucou');

        let value = field.string();
        return value ? value == '1' : null;
      }
      return next();
    };
  }

  transformErrors(error) {
    throw error;
  }
}

class SqliteDialect extends Dialect {
  async initialize() {
    // Create the directory if it does not exist.

    // options.connection.filename = path.resolve(strapi.config.appPath, options.connection.filename);

    await this.db.connection.raw('PRAGMA foreign_keys = ON');
  }

  transformErrors(error) {
    switch (error.errno) {
      case 19: {
        throw new errors.NotNullConstraint();
      }
      default: {
        throw error;
      }
    }
  }
}

const getDialect = db => {
  const { client } = db.connection.client.config;

  switch (client) {
    case 'postgres':
      return new PostgresDialect(db);
    case 'mysql':
      return new MysqlDialect(db);
    case 'sqlite':
      return new SqliteDialect(db);
    default:
      return new Dialect(db);
  }
};

module.exports = {
  getDialect,
};
