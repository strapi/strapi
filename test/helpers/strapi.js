'use strict';

const path = require('path');
// eslint-disable-next-line node/no-extraneous-require
const _ = require('lodash');
const strapi = require('../../packages/strapi/lib');
const { createUtils } = require('./utils');

const superAdminCredentials = {
  email: 'admin@strapi.io',
  firstname: 'admin',
  lastname: 'admin',
  password: 'Password123',
};

const superAdminLoginInfo = _.pick(superAdminCredentials, ['email', 'password']);

const TEST_APP_URL = path.resolve(__dirname, '../../testApp');

const createStrapiInstance = async ({ ensureSuperAdmin = true, logLevel = 'fatal' } = {}) => {
  const options = { dir: TEST_APP_URL };
  const instance = strapi(options);

  await instance.load();

  instance.log.level = logLevel;

  await instance.app
    // Populate Koa routes
    .use(instance.router.routes())
    // Populate Koa methods
    .use(instance.router.allowedMethods());

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
