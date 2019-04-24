'use strict';

const path = require('path');
const _ = require('lodash');
const findPackagePath = require('../load/package-path');
const loadFiles = require('../load/load-files');

/**
 * Loads the apis from the different possible locations
 */
module.exports = async function({ appPath, installedPlugins }) {
  const [api, admin, plugins, localPlugins] = await Promise.all([
    loadLocalApis(appPath),
    loadAdminApis(),
    loadPluginsApis(installedPlugins),
    loadLocalPluginsApis(appPath),
  ]);

  return {
    api,
    admin,
    plugins: _.merge(plugins, localPlugins),
  };
};

const loadLocalApis = appPath =>
  loadFiles(path.resolve(appPath, 'api'), '*/!(config)/*.*(js|json)');

const loadAdminApis = () =>
  loadFiles(
    findPackagePath('strapi-admin'),
    '!(config|node_modules|scripts)//*.*(js|json)'
  );

const loadLocalPluginsApis = appPath =>
  loadFiles(path.resolve(appPath, 'plugins'), '*/!(config)/*.*(js|json)');

const loadPluginsApis = async installedPlugins => {
  let plugins = {};
  for (let plugin of installedPlugins) {
    const pluginPath = findPackagePath(`strapi-plugin-${plugin}`);

    const result = await loadFiles(
      pluginPath,
      '{!(config|node_modules|test)//*.*(js|json),package.json}'
    );

    _.set(plugins, plugin, result);
  }

  return plugins;
};
