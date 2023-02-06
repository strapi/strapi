'use strict';

const fs = require('fs');
const path = require('path');
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
      username: 'strapi',
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
  console.log('main');
  const knex = Knex(databases[process.env.DATABASE]);

  // Lets create our database if it does not exist
  const response = await knex.raw(`CREATE DATABASE ${uuid};`);
  console.log(response);
}

async function CreateDB(uuid) {
  // You can dynamically pass the database name
  // as a command-line argument, or obtain it from
  // a .env file
  console.log(process.env.DATABASE);
  if (process.env.DATABASE !== 'sqlite') {
    await main(uuid).catch(console.log);
  }
}

async function copyFolderRecursiveSync(source, target, noSkipBaseName) {
  let files = [];

  // check if folder needs to be created or integrated
  let targetFolder = path.join(target, path.basename(source));
  if (noSkipBaseName !== true) {
    targetFolder = target;
  }
  try {
    await fs.promises.access(targetFolder);
  } catch (error) {
    await fs.promises.mkdir(targetFolder);
  }

  // copy
  const sourcePath = await fs.promises.lstat(source);
  if (sourcePath.isDirectory()) {
    files = await fs.promises.readdir(source);
    for (const file of files) {
      const curSource = path.join(source, file);
      const curSourcePath = await fs.promises.lstat(curSource);
      if (curSourcePath.isDirectory()) {
        await copyFolderRecursiveSync(curSource, targetFolder, true);
      } else {
        await fs.promises.copyFile(curSource, path.join(targetFolder, file));
      }
    }
  }
}
module.exports = async function (globalConfig) {
  const workerCount = globalConfig.maxWorkers;
  const promiseList = [];
  for (let i = 1; i < workerCount + 1; i += 1) {
    const uuid = `strapi_${i}`;
    promiseList.push(copyFolderRecursiveSync(`./testApps/testApp`, `./testApps/${uuid}`));
    promiseList.push(CreateDB(uuid));
  }
  await Promise.all(promiseList);
};
