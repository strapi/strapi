'use strict';

/**
 * Default db infos
 */
module.exports = {
  sqlite3: {
    connection: {
      filename: '.tmp/data.db',
    },
    useNullAsDefault: true,
  },
  'better-sqlite3': {
    connection: {
      filename: '.tmp/data.db',
    },
    useNullAsDefault: true,
  },
  postgres: {},
  mysql: {},
  mysql2: {},
};
