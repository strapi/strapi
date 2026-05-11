'use strict';

const path = require('path');
const _ = require('lodash');
const dotenv = require('dotenv');
const { createStrapi } = require('../../core/strapi');
const { createUtils } = require('./utils');

const superAdminCredentials = {
  email: 'admin@strapi.io',
  firstname: 'admin',
  lastname: 'admin',
  password: 'Password123',
};

const superAdminLoginInfo = _.pick(superAdminCredentials, ['email', 'password']);

/**
 * When `yarn test:api --perf-artifacts` sets `STRAPI_CI_PERF_ARTIFACT_PATH`, merge perf config
 * before `load()` so NDJSON batches work even if `test-apps/api` was generated from an older
 * template (without `tests/app-template` env wiring).
 */
const applyCiPerformanceArtifactTestConfig = (strapi) => {
  const artifactPath = process.env.STRAPI_CI_PERF_ARTIFACT_PATH;
  if (typeof artifactPath !== 'string' || artifactPath.length === 0) {
    return;
  }

  const intEnv = (key, fallback) => {
    const raw = process.env[key];
    if (raw === undefined || raw === '') {
      return fallback;
    }
    const n = Number.parseInt(String(raw), 10);
    return Number.isFinite(n) ? n : fallback;
  };

  const floatEnv = (key, fallback) => {
    const raw = process.env[key];
    if (raw === undefined || raw === '') {
      return fallback;
    }
    const n = Number.parseFloat(String(raw));
    return Number.isFinite(n) ? n : fallback;
  };

  const dbPerf = strapi.config.get('database.performance') || {};
  strapi.config.set('database.performance', {
    ...dbPerf,
    enabled: true,
    output: 'artifact',
    artifactPath,
    slowQueryMs: intEnv('STRAPI_CI_PERF_SLOW_QUERY_MS', 5),
    sampleRate: Math.min(1, Math.max(0, floatEnv('STRAPI_CI_PERF_SAMPLE_RATE', 1))),
    flushIntervalMs: intEnv('STRAPI_CI_PERF_FLUSH_MS', 2000),
    maxEvents: intEnv('STRAPI_CI_PERF_MAX_EVENTS', 10000),
  });

  const srvPerf = strapi.config.get('server.performance') || {};
  strapi.config.set('server.performance', {
    ...srvPerf,
    requestSummaryEnabled: true,
    requestSampleRate: Math.min(1, Math.max(0, floatEnv('STRAPI_CI_PERF_REQUEST_SAMPLE_RATE', 1))),
    slowRequestMs: intEnv('STRAPI_CI_PERF_SLOW_REQUEST_MS', 500),
    emitStageEvents: process.env.STRAPI_CI_PERF_EMIT_STAGES === 'true',
  });
};

const createStrapiInstance = async ({
  ensureSuperAdmin = true,
  logLevel = 'warn',
  bypassAuth = true,
  bootstrap,
  register,
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

  applyCiPerformanceArtifactTestConfig(instance);

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
