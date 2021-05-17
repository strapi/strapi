const sqlite = {
  client: 'sqlite',
  connection: {
    filename: '.tmp/data.db',
  },
  // debug: true,
  useNullAsDefault: true,
};

const postgres = {
  connection: {
    client: 'postgres',
    database: 'strapi',
    username: 'strapi',
    password: 'strapi',
    port: 5432,
    host: 'localhost',
  },
};

const mysql = {
  connection: {
    client: 'mysql',
    database: 'strapi',
    username: 'strapi',
    password: 'strapi',
    port: 3306,
    host: 'localhost',
  },
};

// const mongo = {
//   connector: 'mongoose',
//   settings: {
//     database: 'strapi',
//     username: 'root',
//     password: 'strapi',
//     port: 27017,
//     host: 'localhost',
//   },
//   options: {},
// };

const db = {
  mysql,
  sqlite,
  postgres,
  // mongo,
};

module.exports = {
  connection: process.env.DB ? db[process.env.DB] || db.sqlite : db.sqlite,
};
