'use strict';

const sqlClientModule = {
  mysql: { mysql: '2.18.1' },
  mysql2: { mysql2: '3.2.0' },
  postgres: { pg: '8.8.0' },
  sqlite: { 'better-sqlite3': '8.0.1' },
  'sqlite-legacy': { sqlite3: '^5.0.2' },
};

/**
 * Client dependencies
 */
module.exports = ({ client }) => {
  if (Object.keys(sqlClientModule).includes(client)) {
    return {
      ...sqlClientModule[client],
    };
  }

  throw new Error(`Invalid client "${client}"`);
};
