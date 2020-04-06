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

  const defaultConfig = {
    launchedAt: Date.now(),
    appPath: dir,
    serveAdminPanel,
    autoReload,
    environment: process.env.NODE_ENV,
    server: {
      host: process.env.HOST || process.env.HOSTNAME || 'localhost',
      port: process.env.PORT || 1337,
    },
    admin: {},
    paths: CONFIG_PATHS,
    middleware: { settings: {} },
    hook: { settings: {} },
    functions: {},
    routes: {},
    info: pkgJSON,
    policies: loadPolicies(path.resolve(dir, 'config', 'policies')),
    installedPlugins: getPrefixedDeps('strapi-plugin', pkgJSON),
    installedMiddlewares: getPrefixedDeps('strapi-middleware', pkgJSON),
    installedHooks: getPrefixedDeps('strapi-hook', pkgJSON),
  };

  const configDir = path.resolve(dir || process.cwd(), 'config');
  const baseConfig = loadConfigDir(configDir);

  const envDir = path.resolve(configDir, 'env', process.env.NODE_ENV);
  const envConfig = loadConfigDir(envDir);

  return createConfigProvider(_.merge(defaultConfig, baseConfig, envConfig));
};
