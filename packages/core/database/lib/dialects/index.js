'use strict';

/**
 * Require our dialect-specific code
 */
const getDialectClass = (client) => {
  switch (client) {
    case 'postgres':
      return require('./postgresql');
    case 'mysql':
      return require('./mysql');
    case 'sqlite':
      return require('./sqlite');
    default:
      throw new Error(`Unknown dialect ${client}`);
  }
};

/**
 * Get the dialect of a database client
 *
 * @param {string} The client value from a project database configuration
 * @returns {string} The dialect of that client
 */
const getDialectName = (client) => {
  switch (client) {
    case 'postgres':
      return 'postgres';
    case 'mysql':
    case 'mysql2':
      return 'mysql';
    case 'sqlite':
    case 'sqlite-legacy':
      return 'sqlite';
    default:
      throw new Error(`Unknown dialect ${client}`);
  }
};

const getDialect = (db) => {
  const { client } = db.config.connection;
  const dialectName = getDialectName(client);

  const constructor = getDialectClass(dialectName);
  const dialect = new constructor(db);
  dialect.client = dialectName;

  return dialect;
};

module.exports = {
  getDialect,
};
