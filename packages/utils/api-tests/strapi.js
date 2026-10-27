'use strict';

const path = require('path');
const _ = require('lodash');
const dotenv = require('dotenv');
const { createStrapi } = require('../../core/strapi');
const { createUtils } = require('./utils');
const profile = require('./profile');

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
  register,
  strapiOptions = {},
  /** When false (default), opts out of deprecated expiresIn so tests use new session config defaults. Set true to test legacy/deprecation behavior. */
  skipDefaultSessionConfig = false,
  /**
   * The model and builder helpers boot Strapi only to write schema files or rows. They never
   * serve GraphQL, so they pass false to skip building the GraphQL schema, which is over a
   * third of a boot.
   */
  buildGraphqlSchema = true,
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

  // Use the new session config so tests do not trigger the expiresIn deprecation warning.
  // Set maxRefreshTokenLifespan and maxSessionLifespan (same defaults as session-auth) so
  // bootstrap sees the new API and does not warn. We do not set expiresIn.
  if (!skipDefaultSessionConfig) {
    const hasNewMaxRefresh =
      instance.config.get('admin.auth.sessions.maxRefreshTokenLifespan') != null;
    const hasNewMaxSession = instance.config.get('admin.auth.sessions.maxSessionLifespan') != null;
    if (!hasNewMaxRefresh || !hasNewMaxSession) {
      const THIRTY_DAYS_SEC = 30 * 24 * 60 * 60;
      const ONE_DAY_SEC = 24 * 60 * 60;
      if (!hasNewMaxRefresh) {
        instance.config.set('admin.auth.sessions.maxRefreshTokenLifespan', THIRTY_DAYS_SEC);
      }
      if (!hasNewMaxSession) {
        instance.config.set('admin.auth.sessions.maxSessionLifespan', ONE_DAY_SEC);
      }
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
    modules.bootstrap = async () => {
      await bootstrap({ strapi: instance });
      await originalBootstrap();
    };
  }

  if (register) {
    const originalRegister = instance.register.bind(instance);
    instance.register = async function () {
      await register({ strapi: instance });
      return originalRegister();
    };
  }

  if (!buildGraphqlSchema) {
    const modules = instance.get('modules');
    const originalModulesBootstrap = modules.bootstrap;
    modules.bootstrap = async () => {
      const graphql = modules.get('plugin::graphql');
      if (graphql) {
        graphql.bootstrap = async () => {};
      }
      await originalModulesBootstrap();
    };
  }

  profile.instrumentInstance(instance);

  const bootStart = performance.now();
  await profile.timed('boot.load', () => instance.load());

  instance.log.level = logLevel;

  await instance.server.listen();

  const utils = createUtils(instance);

  if (ensureSuperAdmin) {
    await utils.createUserIfNotExists(superAdminCredentials);
  }

  profile.record('boot.total', performance.now() - bootStart);

  return instance;
};

module.exports = {
  createStrapiInstance,
  superAdmin: {
    loginInfo: superAdminLoginInfo,
    credentials: superAdminCredentials,
  },
};
