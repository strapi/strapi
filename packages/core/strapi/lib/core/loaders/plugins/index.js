'use strict';

const { join } = require('path');
const fse = require('fs-extra');
const { defaultsDeep, getOr, get } = require('lodash/fp');
const { env } = require('@strapi/utils');
const loadConfigFile = require('../../app-configuration/load-config-file');
const loadFiles = require('../../../load/load-files');
const getEnabledPlugins = require('./get-enabled-plugins');
const getUserPluginsConfig = require('./get-user-plugins-config');

const defaultPlugin = {
  bootstrap() {},
  destroy() {},
  register() {},
  config: {
    default: {},
    validator() {},
  },
  routes: [],
  controllers: {},
  services: {},
  policies: {},
  middlewares: {},
  contentTypes: {},
};

const applyUserExtension = async (plugins) => {
  const extensionsDir = strapi.dirs.dist.extensions;
  if (!(await fse.pathExists(extensionsDir))) {
    return;
  }

  const extendedSchemas = await loadFiles(extensionsDir, '**/content-types/**/schema.json');
  const strapiServers = await loadFiles(extensionsDir, '**/strapi-server.js');

  for (const pluginName of Object.keys(plugins)) {
    const plugin = plugins[pluginName];
    // first: load json schema
    for (const ctName of Object.keys(plugin.contentTypes)) {
      const extendedSchema = get([pluginName, 'content-types', ctName, 'schema'], extendedSchemas);
      if (extendedSchema) {
        plugin.contentTypes[ctName].schema = {
          ...plugin.contentTypes[ctName].schema,
          ...extendedSchema,
        };
      }
    }
    // second: execute strapi-server extension
    const strapiServer = get([pluginName, 'strapi-server'], strapiServers);
    if (strapiServer) {
      plugins[pluginName] = await strapiServer(plugin);
    }
  }
};

const applyUserConfig = async (plugins) => {
  const userPluginsConfig = await getUserPluginsConfig();

  for (const pluginName of Object.keys(plugins)) {
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

const loadPlugins = async (strapi) => {
  const plugins = {};

  const enabledPlugins = await getEnabledPlugins(strapi);

  strapi.config.set('enabledPlugins', enabledPlugins);

  for (const pluginName of Object.keys(enabledPlugins)) {
    const enabledPlugin = enabledPlugins[pluginName];

    let serverEntrypointPath;

    try {
      serverEntrypointPath = join(enabledPlugin.pathToPlugin, 'strapi-server.js');
    } catch (e) {
      throw new Error(
        `Error loading the plugin ${pluginName} because ${pluginName} is not installed. Please either install the plugin or remove it's configuration.`
      );
    }

    // only load plugins with a server entrypoint
    if (!(await fse.pathExists(serverEntrypointPath))) {
      continue;
    }

    const pluginServer = loadConfigFile(serverEntrypointPath);
    plugins[pluginName] = defaultsDeep(defaultPlugin, pluginServer);
  }

  // TODO: validate plugin format
  await applyUserConfig(plugins);
  await applyUserExtension(plugins);

  for (const pluginName of Object.keys(plugins)) {
    strapi.container.get('plugins').add(pluginName, plugins[pluginName]);
  }
};

module.exports = loadPlugins;
