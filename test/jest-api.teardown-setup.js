'use strict';

const fs = require('fs');
const Knex = require('knex');

const databases = {
  postgres: {
    client: 'postgres',
    connection: {
      connectionString: 'postgresql://strapi:strapi@127.0.0.1',
    },
  },
  mysql: {
    client: 'mysql',
    connection: {
      host: '127.0.0.1',
      port: 3306,
      database: 'strapi_test',
      username: 'root',
      password: 'strapi',
    },
  },
  sqlite: {
    client: 'sqlite',
    connection: {
      filename: './tmp/data.db',
    },
    useNullAsDefault: true,
  },
};

async function main(uuid) {
  const knex = Knex(databases[process.env.DATABASE]);

  // Lets create our database if it does not exist
  await knex.raw(`DROP DATABASE ${uuid};`);
  // knex.destory();
}

async function RemoveDB(uuid) {
  // You can dynamically pass the database name
  // as a command-line argument, or obtain it from
  // a .env file
  if (process.env.DATABASE !== 'sqlite') {
    await main(uuid).catch(console.log);
  }
}
module.exports = async function (globalConfig) {
  const workerCount = globalConfig.maxWorkers;
  const promiseList = [];
  for (let i = 1; i < workerCount + 1; i += 1) {
    const uuid = `strapi_${i}`;
    promiseList.push(fs.promises.rm(`./testApps/${uuid}`, { recursive: true, force: true }));
    promiseList.push(RemoveDB(uuid));
  }
  await Promise.all(promiseList);
};
