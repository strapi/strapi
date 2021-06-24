'use strict';

const errors = require('../errors');

class Dialect {
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
  transformErrors(error) {
    throw error;
  }
}

class SqliteDialect extends Dialect {
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

const getDialect = connection => {
  const { client } = connection.client.config;

  switch (client) {
    case 'postgres':
      return new PostgresDialect();
    case 'mysql':
      return new MysqlDialect();
    case 'sqlite':
      return new SqliteDialect();
    default:
      return new Dialect();
  }
};

module.exports = {
  getDialect,
};
