'use strict';
/**
 * @typedef {import('@strapi/database').Database} Database
 * @typedef {typeof import('./postgresql')} PostgresDialect
 * @typedef {typeof import('./mysql')} MysqlDialect
 * @typedef {typeof import('./sqlite')} SqliteDialect
 */

/**
 * @typedef {object} Clients
 * @property {PostgresDialect} Clients.postgres
 * @property {MysqlDialect} Clients.mysql
 * @property {SqliteDialect} Clients.sqlite
 */

/**
 * @template {keyof Clients} T
 * @param {T} client
 */
const getDialectClass = client => {
  switch (client) {
    case 'postgres':
      return require('./postgresql');
    case 'mysql':
      return require('./mysql');
    case 'sqlite':
      return require('./sqlite');
    default:
      throw new Error(`Unknow dialect ${client}`);
  }
};

/**
 * @param {Database} db
 */
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
