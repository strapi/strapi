'use strict';

/**
 * Default db infos
 */
module.exports = {
  sqlite: {
    connector: 'bookshelf',
    settings: {
      client: 'sqlite',
      filename: '.tmp/data.db',
    },
    options: {
      useNullAsDefault: true,
    },
  },
  postgres: {
    connector: 'bookshelf',
    settings: {
      client: 'postgres',
    },
  },
  mysql: {
    connector: 'bookshelf',
    settings: {
      client: 'mysql',
    },
  },
  mongo: {
    connector: 'mongoose',
  },
};
