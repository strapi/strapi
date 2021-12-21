'use strict';

const { join } = require('path');
const fse = require('fs-extra');
const { merge } = require('lodash/fp');
const loadConfigFile = require('../../app-configuration/load-config-file');

/**
 * Return user defined plugins' config
 * first load config from `config/plugins.js`
 * and then merge config from `config/env/{env}/plugins.js`
 * @return {Promise<{}>}
 */
const getUserPluginsConfig = async () => {
  const globalUserConfigPath = join(strapi.dirs.config, 'plugins.js');
  const currentEnvUserConfigPath = join(
    strapi.dirs.config,
    'env',
    process.env.NODE_ENV,
    'plugins.js'
  );
  let config = {};

  // assign global user config if exists
  if (await fse.pathExists(globalUserConfigPath)) {
    config = loadConfigFile(globalUserConfigPath);
  }

  // and merge user config by environment if exists
  if (await fse.pathExists(currentEnvUserConfigPath)) {
    config = merge(config, loadConfigFile(currentEnvUserConfigPath));
  }

  return config;
};

module.exports = getUserPluginsConfig;
