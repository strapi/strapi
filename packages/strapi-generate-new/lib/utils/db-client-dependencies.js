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
      return {
        'strapi-connector-bookshelf': scope.strapiVersion,
        knex: '<0.20.0',
        [sqlClientModule[client]]: '5.0.0',
      };
    case 'postgres':
    case 'mysql':
      return {
        'strapi-connector-bookshelf': scope.strapiVersion,
        knex: '<0.20.0',
        [sqlClientModule[client]]: 'latest',
      };
    case 'mongo':
      return {
        'strapi-connector-mongoose': scope.strapiVersion,
      };
    default:
      throw new Error(`Invalid client "${client}"`);
  }
};
