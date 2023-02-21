'use strict';

const path = require('path');
const _ = require('lodash');
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

const TEST_APP_URL = path.resolve(__dirname, '../../testApp');

/**
 * @param {*} config
 * @param {Function} config.bootstrap - A function that will be called with the strapi instance as argument
 * @param {boolean} config.ensureSuperAdmin - If true, will create a super admin user if none exists
 * @param {string} config.logLevel - The log level to use
 * @param {boolean} config.bypassAuth - If true, will bypass the auth middleware
 * @return {Strapi}
 */
const createStrapiInstance = async ({
  bootstrap = () => {},
  ensureSuperAdmin = true,
  logLevel = 'error',
  bypassAuth = true,
} = {}) => {
  // read .env file as it could have been updated
  dotenv.config({ path: process.env.ENV_PATH });
  const options = {
    appDir: TEST_APP_URL,
    distDir: TEST_APP_URL,
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

  bootstrap(instance);

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
  superAdmin: {
    loginInfo: superAdminLoginInfo,
    credentials: superAdminCredentials,
  },
};
