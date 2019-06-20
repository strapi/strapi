const sqlite = {
  connector: 'strapi-hook-bookshelf',
  settings: {
    client: 'sqlite',
    filename: '.tmp/data.db',
  },
  options: {
    useNullAsDefault: true,
  },
};

const postgres = {
  connector: 'strapi-hook-bookshelf',
  settings: {
    client: 'postgres',
    database: 'strapi',
    username: 'strapi',
    password: 'strapi',
    port: 5432,
    host: 'localhost',
  },
  options: {},
};

const mongo = {
  connector: 'strapi-hook-mongoose',
  settings: {
    database: 'strapi',
    username: 'root',
    password: 'strapi',
    port: 27017,
    host: 'localhost',
  },
  options: {},
};

const db = {
  sqlite,
  postgres,
  mongo,
};

module.exports = {
  defaultConnection: 'default',
  connections: {
    default: process.env.DB ? db[process.env.DB] || db.sqlite : db.sqlite,
  },
};
