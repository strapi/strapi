/** @import { Core } from '@strapi/strapi' */

/** @type {Core.Config.Database<'sqlite'>['connection']} */
const sqlite = {
  client: 'sqlite',
  connection: {
    filename: '.tmp/data.db',
  },
  useNullAsDefault: true,
};

/** @type {Core.Config.Database<'postgres'>['connection']} */
const postgres = {
  client: 'postgres',
  connection: {
    database: 'strapi',
    user: 'strapi',
    password: 'strapi',
    port: 5432,
    host: 'localhost',
  },
};

/** @type {Core.Config.Database<'mysql'>['connection']} */
const mysql = {
  client: 'mysql',
  connection: {
    database: 'strapi',
    user: 'strapi',
    password: 'strapi',
    port: 3306,
    host: 'localhost',
  },
};

/** @type {Core.Config.Database<'mysql'>['connection']} */
const mariadb = {
  client: 'mysql',
  connection: {
    database: 'strapi',
    user: 'strapi',
    password: 'strapi',
    port: 3307,
    host: 'localhost',
  },
};

const db = {
  mysql,
  sqlite,
  postgres,
  mariadb,
};

module.exports = {
  connection: process.env.DB ? db[process.env.DB] || db.sqlite : db.sqlite,
};
