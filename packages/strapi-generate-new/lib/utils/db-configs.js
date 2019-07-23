'use strict';

/**
 * Default db infos
 */
module.exports = {
  sqlite: {
    connector: 'strapi-hook-bookshelf',
    settings: {
      client: 'sqlite',
      filename: '.tmp/data.db',
    },
    options: {
      useNullAsDefault: true,
    },
  },
  postgres: {
    connector: 'strapi-hook-bookshelf',
    settings: {
      client: 'postgres',
    },
  },
  mysql: {
    connector: 'strapi-hook-bookshelf',
    settings: {
      client: 'mysql',
    },
  },
  mongo: {
    connector: 'strapi-hook-mongoose',
  },
};
