'use strict';

const sqlClientModule = {
  sqlite: 'sqlite3',
  postgres: 'pg',
  mysql: 'mysql',
};

/**
 * Client dependencies
 */
module.exports = ({ scope, client }) => {
  switch (client) {
    case 'sqlite':
    case 'postgres':
    case 'mysql':
      return {
        'strapi-hook-bookshelf': scope.strapiVersion,
        'strapi-hook-knex': scope.strapiVersion,
        knex: 'latest',
        [sqlClientModule[client]]: 'latest',
      };
    case 'mongo':
      return {
        'strapi-hook-mongoose': scope.strapiVersion,
      };
    default:
      throw new Error(`Invalid client ${client}`);
  }
};
