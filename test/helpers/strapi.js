'use strict';

// eslint-disable-next-line node/no-extraneous-require
const _ = require('lodash');
const path = require('path');
const { createUtils } = require('./utils');

const superAdminCredentials = {
  email: 'admin@strapi.io',
  firstname: 'admin',
  lastname: 'admin',
  password: 'Password123',
};

const superAdminLoginInfo = _.pick(superAdminCredentials, ['email', 'password']);

const TEST_APP_URL = path.resolve(__dirname, '../../testApp');

const createStrapiInstance = async (params = {}) => {
  try {
    jest.resetModules();
    const strapi = require('../../packages/strapi/lib');
    const { ensureSuperAdmin = false } = params;
    const options = { dir: TEST_APP_URL };
    const instance = strapi(options);

    await instance.load();

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
  } catch (e) {
    console.log(e);
  }
};

module.exports = {
  createStrapiInstance,
  superAdmin: {
    loginInfo: superAdminLoginInfo,
    credentials: superAdminCredentials,
  }
};
