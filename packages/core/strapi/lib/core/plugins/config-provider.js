'use strict'

const { env } = require('@strapi/utils');
const { isFunction } = require('lodash/fp');
const createConfig = require('../domain/config');

module.exports = async (pluginName, pluginDefaultConfig) => {
  const defaultConfig = isFunction(pluginDefaultConfig)
    ? await pluginDefaultConfig({ env })
    : pluginDefaultConfig;

  const userPluginConfig = strapi.config.get(`plugins.${pluginName}`);

  return createConfig(userPluginConfig, defaultConfig);
};
