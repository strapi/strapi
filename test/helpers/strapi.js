'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');
const Knex = require('knex');
const strapi = require('../../packages/core/strapi/lib');
const { createUtils } = require('./utils');

const superAdminCredentials = {
  email: 'admin@strapi.io',
  firstname: 'admin',
  lastname: 'admin',
  password: 'Password123',
};

const superAdminLoginInfo = _.pick(superAdminCredentials, ['email', 'password']);

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

function CreateDB(uuid) {
  // You can dynamically pass the database name
  // as a command-line argument, or obtain it from
  // a .env file
  async function main(uuid) {
    console.log('Koekjes');
    console.log(databases[process.env.DATABASE]);
    const knex = Knex(databases[process.env.DATABASE]);

    // Lets create our database if it does not exist
    await knex.raw(`CREATE DATABASE ${uuid};`);
    process.env.DATABASE_NAME = uuid;
    // knex.destory();
  }
  if (process.env.DATABASE !== 'sqlite') {
    main(uuid).catch(console.log);
  }
}

function copyFolderRecursiveSync(source, target, noSkipBaseName) {
  let files = [];

  // check if folder needs to be created or integrated
  let targetFolder = path.join(target, path.basename(source));
  if (noSkipBaseName !== true) {
    targetFolder = target;
  }
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder);
  }

  // copy
  if (fs.lstatSync(source).isDirectory()) {
    files = fs.readdirSync(source);
    files.forEach(function (file) {
      const curSource = path.join(source, file);
      if (fs.lstatSync(curSource).isDirectory()) {
        copyFolderRecursiveSync(curSource, targetFolder, true);
      } else {
        fs.copyFileSync(curSource, path.join(targetFolder, file));
      }
    });
  }
}

const createStrapiLoader = async () => {
  const uuid = `strapi_${crypto.randomUUID().replace(/-/g, '')}`;
  copyFolderRecursiveSync(`./testApps/testApp`, `./testApps/${uuid}`);
  CreateDB(uuid);
  // await generateTestApp({ appName: uuid, database: sqlite, changeDBFile: true });
  // read .env file as it could have been updated
  dotenv.config({ path: process.env.ENV_PATH });
  process.env.PORT = 0;
  process.env.UUID = uuid;
};

const createStrapiInstance = async ({
  ensureSuperAdmin = true,
  logLevel = 'error',
  bypassAuth = true,
} = {}) => {
  // read .env file as it could have been updated
  dotenv.config({ path: process.env.ENV_PATH });
  const options = {
    appDir: `./testApps/${process.env.UUID}`,
    distDir: `./testApps/${process.env.UUID}`,
  };
  const instance = strapi(options);

  if (bypassAuth) {
    instance.container.get('auth').register('content-api', {
      name: 'test-auth',
      authenticate() {
        return { authenticated: true };
      },
      verify() {},
    });
  }
  await instance.load();

  instance.log.level = logLevel;

  await instance.server.listen();

  const utils = createUtils(instance);

  if (ensureSuperAdmin) {
    await utils.createUserIfNotExists(superAdminCredentials);
  }

  return instance;
};

module.exports = {
  createStrapiInstance,
  createStrapiLoader,
  superAdmin: {
    loginInfo: superAdminLoginInfo,
    credentials: superAdminCredentials,
  },
};
