'use strict';

const dotenv = require('dotenv');

dotenv.config({ path: process.env.ENV_PATH });
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const _ = require('lodash');
const path = require('path');

const createConfigProvider = require('./config-provider');
const loadConfigDir = require('./config-loader');

const getPrefixedDeps = require('../../utils/get-prefixed-dependencies');
const loadPolicies = require('../load-policies');
const loadFunctions = require('../load-functions');

const CONFIG_PATHS = {
  admin: 'admin',
  api: 'api',
  config: 'config',
  controllers: 'controllers',
  models: 'models',
  plugins: 'plugins',
  policies: 'policies',
  tmp: '.tmp',
  services: 'services',
  static: 'public',
  validators: 'validators',
  views: 'views',
};

module.exports = (dir, initialConfig = {}) => {
  const { autoReload = false, serveAdminPanel = true } = initialConfig;

  const pkgJSON = require(path.resolve(dir, 'package.json'));

  const configDir = path.resolve(dir || process.cwd(), 'config');

  const defaultConfig = {
    launchedAt: Date.now(),
    appPath: dir,
    serveAdminPanel,
    autoReload,
    environment: process.env.NODE_ENV,
    server: {
      host: process.env.HOST || process.env.HOSTNAME || 'localhost',
      port: process.env.PORT || 1337,
      proxy: { enabled: false },
      cron: { enabled: false },
      admin: { autoOpen: false },
    },
    admin: {},
    paths: CONFIG_PATHS,
    middleware: {
      timeout: 1000,
      load: {
        before: ['responseTime', 'logger', 'cors', 'responses', 'gzip'],
        order: [],
        after: ['parser', 'router'],
      },
      settings: {},
    },
    hook: {
      timeout: 1000,
      load: { before: [], order: [], after: [] },
      settings: {},
    },
    routes: {},
    info: pkgJSON,
    policies: loadPolicies(path.resolve(configDir, 'policies')),
    functions: loadFunctions(path.resolve(configDir, 'functions')),
    installedPlugins: getPrefixedDeps('strapi-plugin', pkgJSON),
    installedMiddlewares: getPrefixedDeps('strapi-middleware', pkgJSON),
    installedHooks: getPrefixedDeps('strapi-hook', pkgJSON),
  };

  const baseConfig = loadConfigDir(configDir);

  const envDir = path.resolve(configDir, 'env', process.env.NODE_ENV);
  const envConfig = loadConfigDir(envDir);

  return createConfigProvider(_.merge(defaultConfig, baseConfig, envConfig));
};
