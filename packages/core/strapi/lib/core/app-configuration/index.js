'use strict';

const os = require('os');
const path = require('path');
const _ = require('lodash');
const { omit } = require('lodash/fp');
const dotenv = require('dotenv');

dotenv.config({ path: process.env.ENV_PATH });

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const loadConfigDir = require('./config-loader');

const { version: strapiVersion } = require(path.join(__dirname, '../../../package.json'));

const defaultConfig = {
  server: {
    host: process.env.HOST || os.hostname() || 'localhost',
    port: process.env.PORT || 1337,
    proxy: false,
    cron: { enabled: false },
    admin: { autoOpen: false },
    dirs: { public: './public' },
  },
  admin: {},
  api: {
    rest: {
      prefix: '/api',
    },
  },
};

module.exports = (dirs, initialConfig = {}) => {
  const { appDir, distDir } = dirs;
  const { autoReload = false, serveAdminPanel = true } = initialConfig;

  const pkgJSON = require(path.resolve(appDir, 'package.json'));

  const configDir = path.resolve(distDir || process.cwd(), 'config');

  const rootConfig = {
    launchedAt: Date.now(),
    serveAdminPanel,
    autoReload,
    environment: process.env.NODE_ENV,
    uuid: _.get(pkgJSON, 'strapi.uuid'),
    packageJsonStrapi: _.omit(_.get(pkgJSON, 'strapi', {}), 'uuid'),
    info: {
      ...pkgJSON,
      strapi: strapiVersion,
    },
  };

  const baseConfig = omit('plugins', loadConfigDir(configDir)); // plugin config will be loaded later

  const envDir = path.resolve(configDir, 'env', process.env.NODE_ENV);
  const envConfig = loadConfigDir(envDir);
  
  let mergedConfig = {}
  
  // apply the environment configuration only if there is one and apply the specific cron configuration of the environement
  if(_.isEmpty(envConfig)){
    mergedConfig = _.merge(rootConfig, defaultConfig, baseConfig)
  } else {
    mergedConfig = _.merge(rootConfig, defaultConfig, baseConfig, envConfig)
    mergedConfig.server.cron = envConfig?.server?.cron ? envConfig.server.cron : {}  
  }
  return mergedConfig;
};
