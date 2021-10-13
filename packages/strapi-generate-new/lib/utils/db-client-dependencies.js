'use strict';

const sqlClientModule = {
  sqlite: { sqlite3: '5.0.0' },
  postgres: { pg: '8.5.1' },
  mysql: { mysql: '2.18.1' },
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
        'strapi-connector-bookshelf': scope.strapiVersion,
        knex: '0.21.18',
        ...sqlClientModule[client],
      };
    case 'mongo':
      return {
        'strapi-connector-mongoose': scope.strapiVersion,
      };
    default:
      throw new Error(`Invalid client "${client}"`);
  }
};
