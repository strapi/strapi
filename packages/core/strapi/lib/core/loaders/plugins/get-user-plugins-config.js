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
  let config = {};

  // assign global user config if exists
  for (const file of ['plugins.js', 'plugins.ts', 'plugins.mjs', 'plugins.cjs']) {
    const filepath = join(strapi.dirs.config, file);
    if (await fse.pathExists(filepath)) {
      config = loadConfigFile(filepath);
      break;
    }
  }

  // and merge user config by environment if exists
  for (const file of ['plugins.js', 'plugins.ts', 'plugins.mjs', 'plugins.cjs']) {
    let filepath = join(strapi.dirs.config, 'env', process.env.NODE_ENV, file);
    if (await fse.pathExists(filepath)) {
      config = merge(config, loadConfigFile(filepath));
      break;
    }
  }

  return config;
};

module.exports = getUserPluginsConfig;
