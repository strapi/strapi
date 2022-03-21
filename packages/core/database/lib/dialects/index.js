'use strict';

const getDialectClass = client => {
  switch (client) {
    case 'postgres':
      return require('./postgresql');
    case 'mysql':
    case 'mysql2':
      return require('./mysql');
    case 'sqlite3':
    case 'better-sqlite3':
      return require('./sqlite3');
    default:
      throw new Error(`Unknown dialect ${client}`);
  }
};

const getDialect = db => {
  const { client } = db.config.connection;

  const constructor = getDialectClass(client);
  const dialect = new constructor(db);
  dialect.client = client;

  return dialect;
};

module.exports = {
  getDialect,
};
