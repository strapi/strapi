'use strict';

const { join } = require('path');
const { existsSync } = require('fs');
const { defaultsDeep, getOr } = require('lodash/fp');
const { env } = require('@strapi/utils');
const loadConfigFile = require('../app-configuration/load-config-file');
const getEnabledPlugins = require('./get-enabled-plugins');

const defaultPlugin = {
  bootstrap: () => {},
  destroy: () => {},
  register: () => {},
  config: {
    default: {},
    validator: () => {},
  },
  routes: [],
  controllers: {},
  services: {},
  policies: {},
  middlewares: {},
  contentTypes: [],
};

const formatContentTypes = plugins => {
  for (const pluginName in plugins) {
    const plugin = plugins[pluginName];
    for (const contentTypeName in plugin.contentTypes) {
      const ctSchema = plugin.contentTypes[contentTypeName].schema;
      ctSchema.plugin = pluginName;
      ctSchema.uid = `plugin::${pluginName}.${ctSchema.singularName}`;
    }
  }
};

const formatConfig = plugins => {
  const userPluginConfigPath = join(strapi.dir, 'config', 'plugins.js');
  const userPluginsConfig = existsSync(userPluginConfigPath)
    ? loadConfigFile(userPluginConfigPath)
    : {};

  for (const pluginName in plugins) {
    const plugin = plugins[pluginName];
    const userPluginConfig = getOr({}, `${pluginName}.config`, userPluginsConfig);
    const formattedConfig = defaultsDeep(plugin.config.default, userPluginConfig);
    try {
      plugin.config.validator(formattedConfig);
    } catch (e) {
      throw new Error(`Error regarding ${pluginName} config: ${e.message}`);
    }
    plugin.config = formattedConfig;
  }
};

const loadPlugins = async strapi => {
  const plugins = {};
  const enabledPlugins = await getEnabledPlugins(strapi);

  for (const pluginName in enabledPlugins) {
    const enabledPlugin = enabledPlugins[pluginName];
    const loadPluginServer = require(join(enabledPlugin.pathToPlugin, 'strapi-server.js'));
    const pluginServer = await loadPluginServer({ env });
    plugins[pluginName] = defaultsDeep(defaultPlugin, pluginServer);
  }
  // TODO: validate plugin format
  formatConfig(plugins);
  formatContentTypes(plugins);

  return plugins;
};

module.exports = loadPlugins;
