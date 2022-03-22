'use strict';

const getDialectClass = client => {
  switch (client) {
    case 'postgres':
      return require('./postgresql');
    case 'mysql':
      return require('./mysql');
    case 'sqlite':
    case 'sqlite3':
    case 'better-sqlite3':
      return require('./sqlite');
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
