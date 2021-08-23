'use strict';

const { join, resolve } = require('path');
const { existsSync } = require('fs');
const { defaultsDeep, getOr, get } = require('lodash/fp');
const { env } = require('@strapi/utils');
const loadConfigFile = require('../app-configuration/load-config-file');
const loadFiles = require('../../load/load-files');
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
  contentTypes: {},
};

const applyUserExtension = async plugins => {
  const extensionsDir = resolve(strapi.dir, 'extensions');
  if (!existsSync(extensionsDir)) {
    return;
  }

  const extendedSchemas = await loadFiles(extensionsDir, '**/content-types/**/schema.json');
  const strapiServers = await loadFiles(extensionsDir, '**/strapi-server.js');

  for (const pluginName in plugins) {
    const plugin = plugins[pluginName];
    // first: load json schema
    for (const ctName in plugin.contentTypes) {
      const extendedSchema = get([pluginName, 'content-types', ctName, 'schema'], extendedSchemas);
      if (extendedSchema) {
        plugin.contentTypes[ctName].schema = extendedSchema;
      }
    }
    // second: execute strapi-server extension
    const strapiServer = get([pluginName, 'strapi-server'], strapiServers);
    if (strapiServer) {
      plugins[pluginName] = await strapiServer(plugin);
    }
  }
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

const applyUserConfig = plugins => {
  const userPluginConfigPath = join(strapi.dir, 'config', 'plugins.js');
  const userPluginsConfig = existsSync(userPluginConfigPath)
    ? loadConfigFile(userPluginConfigPath)
    : {};

  for (const pluginName in plugins) {
    const plugin = plugins[pluginName];
    const userPluginConfig = getOr({}, `${pluginName}.config`, userPluginsConfig);
    const defaultConfig =
      typeof plugin.config.default === 'function'
        ? plugin.config.default({ env })
        : plugin.config.default;

    const config = defaultsDeep(defaultConfig, userPluginConfig);
    try {
      plugin.config.validator(config);
    } catch (e) {
      throw new Error(`Error regarding ${pluginName} config: ${e.message}`);
    }
    plugin.config = config;
  }
};

const loadPlugins = async strapi => {
  const plugins = {};
  const enabledPlugins = await getEnabledPlugins(strapi);

  for (const pluginName in enabledPlugins) {
    const enabledPlugin = enabledPlugins[pluginName];
    const pluginServer = loadConfigFile(join(enabledPlugin.pathToPlugin, 'strapi-server.js'));
    plugins[pluginName] = defaultsDeep(defaultPlugin, pluginServer);
  }
  // TODO: validate plugin format
  applyUserConfig(plugins);
  await applyUserExtension(plugins);
  formatContentTypes(plugins);

  return plugins;
};

module.exports = loadPlugins;
