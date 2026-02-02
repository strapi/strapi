'use strict';

const path = require('path');
const _ = require('lodash');
const dotenv = require('dotenv');
const { createStrapi } = require('../../core/strapi');
const { Core } = require('../../core/types');
const { createUtils } = require('./utils');

const superAdminCredentials = {
  email: 'admin@strapi.io',
  firstname: 'admin',
  lastname: 'admin',
  password: 'Password123',
};

const superAdminLoginInfo = _.pick(superAdminCredentials, ['email', 'password']);

const createStrapiInstance = async ({
  ensureSuperAdmin = true,
  logLevel = 'warn',
  bypassAuth = true,
  bootstrap,
  strapiOptions = {},
  /** When false (default), opts out of deprecated expiresIn so tests use new session config defaults. Set true to test legacy/deprecation behavior. */
  skipDefaultSessionConfig = false,
} = {}) => {
  // read .env file as it could have been updated
  dotenv.config({ path: process.env.ENV_PATH });

  const baseDir = path.dirname(process.env.ENV_PATH);

  const options = {
    appDir: baseDir,
    distDir: baseDir,
    autoReload: true,
    ...strapiOptions,
  };
  const instance = createStrapi(options);

  // Ensure Koa trusts X-Forwarded-* headers in tests so asHTTPS() can simulate HTTPS
  instance.config.set('server.proxy.koa', true);

  // Opt out of deprecated expiresIn by setting an empty session options object
  // This prevents the default expiresIn from triggering deprecation warnings
  // Only set if not already configured to avoid overriding user settings
  if (!skipDefaultSessionConfig) {
    const existingSessionOptions = instance.config.get('admin.auth.sessions.options');
    if (!existingSessionOptions) {
      instance.config.set('admin.auth.sessions.options', {});
    }
  }

  if (bypassAuth) {
    instance.get('auth').register('content-api', {
      name: 'test-auth',
      authenticate() {
        return { authenticated: true };
      },
      verify() {},
    });
  }

  if (bootstrap) {
    const modules = instance.get('modules');
    const originalBootstrap = modules.bootstrap;
    // decorate modules bootstrap
    modules.bootstrap = async () => {
      await bootstrap({ strapi: instance });

      await originalBootstrap();
    };
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
  superAdmin: {
    loginInfo: superAdminLoginInfo,
    credentials: superAdminCredentials,
  },
};
