'use strict';

const sqlClientModule = {
  mysql: { mysql: '2.18.1' },
  postgres: { pg: '8.6.0' },
  sqlite: { 'better-sqlite3': '7.4.6' },
  'sqlite-legacy': { sqlite3: '^5.0.2' },
};

/**
 * Client dependencies
 */
module.exports = ({ client }) => {
  switch (client) {
    case 'sqlite':
    case 'sqlite-legacy':
    case 'postgres':
    case 'mysql':
      return {
        ...sqlClientModule[client],
      };

    default:
      throw new Error(`Invalid client "${client}"`);
  }
};
