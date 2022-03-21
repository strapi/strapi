'use strict';

const postgres = {
  client: 'postgres',
  connection: {
    database: 'strapi',
    user: 'strapi',
    password: 'strapi',
  },
  // debug: true,
};

const mysql = {
  client: 'mysql',
  connection: {
    database: 'strapi',
    user: 'strapi',
    password: 'strapi',
  },
  // debug: true,
};

const mysql2 = {
  client: 'mysql2',
  connection: {
    database: 'strapi',
    user: 'strapi',
    password: 'strapi',
  },
  // debug: true,
};

const sqlite = {
  client: 'sqlite',
  connection: {
    filename: 'data.sqlite',
  },
  useNullAsDefault: true,
  // debug: true,
};

const betterSqlite3 = {
  client: 'sqlite',
  connection: {
    filename: 'data.sqlite',
  },
  useNullAsDefault: true,
  // debug: true,
};

module.exports = {
  sqlite,
  betterSqlite3,
  postgres,
  mysql,
  mysql2,
};
