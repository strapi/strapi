'use strict';

const path = require('path');
const _ = require('lodash');
const fs = require('fs-extra');

const loadConfig = require('../load/config');
const findPackagePath = require('../load/package-path');

const PLUGIN_PREFIX = 'strapi-plugin';

module.exports = async ({ appPath, installedPlugins }) => {
  const [config, admin, api, plugins, localPlugins] = await Promise.all([
    loadAppConfig(appPath),
    loadAdminConfig(),
    loadApisConfig(appPath),
    loadPluginsConfig(installedPlugins),
    loadLocalPluginsConfig(appPath),
  ]);

  return {
    config,
    admin,
    api,
    plugins: _.merge(plugins, localPlugins),
  };
};

// Loads an app config folder
const loadAppConfig = appPath => loadConfig(path.resolve(appPath, 'config'));

// Loads the strapi-admin config folder
const loadAdminConfig = async () => ({
  config: await loadConfig(
    path.resolve(findPackagePath('strapi-admin'), 'config')
  ),
});

// Loads every apis config folder
const loadApisConfig = async appPath => {
  let apis = {};
  const apisFolder = path.resolve(appPath, 'api');
  const apiFolders = await fs.readdir(apisFolder);

  for (let apiFolder of apiFolders) {
    const apiConfig = await loadConfig(
      path.resolve(apisFolder, apiFolder, 'config')
    );

    _.set(apis, [apiFolder, 'config'], apiConfig);
  }

  return apis;
};

const loadLocalPluginsConfig = async appPath => {
  let localPlugins = {};
  const pluginsFolder = path.resolve(appPath, 'plugins');
  const pluginsFolders = await fs.readdir(pluginsFolder);

  for (let pluginsFolder of pluginsFolders) {
    const pluginsConfig = await loadConfig(
      path.resolve(pluginsFolder, pluginsFolder, 'config')
    );

    _.set(localPlugins, [pluginsFolder, 'config'], pluginsConfig);
  }

  return localPlugins;
};

// Loads installed plugins config
const loadPluginsConfig = async pluginsNames => {
  let plugins = {};
  for (let plugin of pluginsNames) {
    const pluginConfig = await loadConfig(
      path.resolve(findPackagePath(plugin), 'config')
    );

    _.set(
      plugins,
      [plugin.substring(PLUGIN_PREFIX.length + 1), 'config'],
      pluginConfig
    );
  }

  return plugins;
};
