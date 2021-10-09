const sqlite = {
  client: 'sqlite',
  connection: {
    filename: '.tmp/data.db',
  },
  useNullAsDefault: true,
};

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

const db = {
  mysql,
  sqlite,
  postgres,
};

/**
 * You can have multiple Strapi installations in the same database
 * if you give each installation a unique table prefix.
 *
 * Requirements:
 * - Maximum 10 characters.
 * - Letters, numbers and underscore.
 *
 * Table prefix will be transformed using Lodash snakeCase-function. (https://lodash.com/docs#snakeCase)
 */
const tablePrefix = '';

module.exports = {
  connection: process.env.DB ? db[process.env.DB] || db.sqlite : db.sqlite,
  settings: {
    tablePrefix,
  },
};
