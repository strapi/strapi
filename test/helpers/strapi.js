'use strict';

const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');
const strapi = require('../../packages/core/strapi/lib');
const { createUtils } = require('./utils');

const superAdminCredentials = {
  email: 'admin@strapi.io',
  firstname: 'admin',
  lastname: 'admin',
  password: 'Password123',
};

const superAdminLoginInfo = _.pick(superAdminCredentials, ['email', 'password']);

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
  const uuid = crypto.randomUUID();
  copyFolderRecursiveSync(`./testApps/testApp`, `./testApps/${uuid}`);
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
