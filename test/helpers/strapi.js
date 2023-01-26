'use strict';

const _ = require('lodash');
const fs = require('fs');
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

const createStrapiLoader = async () => {
  const uuid = crypto.randomUUID();
  fs.cpSync(`./testApps/testApp`, `./testApps/${uuid}`, { recursive: true });
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
