'use strict';

// Dependencies.
// const glob = require('glob');
const path = require('path');
const slash = require('slash');
const _ = require('lodash');
const glob = require('../load/glob');
const findPackagePath = require('../load/package-path');

module.exports = async function({ appPath, installedPlugins }) {
  const [api, admin, plugins, localPlugins] = await Promise.all([
    loadAppApis(appPath),
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

const loadFile = (obj, dir, file, prefix = null) => {
  const rootPath = path
    .join(path.dirname(file), path.basename(file, path.extname(file)))
    .replace(/(\.settings|.json|.js)/g, '')
    .toLowerCase();

  const propPath = slash(rootPath).split('/');

  _.set(
    obj,
    prefix ? [prefix].concat(propPath) : propPath,
    require(path.join(dir, file))
  );
};

const loadAppApis = async appPath => {
  let apis = {};
  const apiPath = path.resolve(appPath, 'api');

  const files = await glob('*/!(config)/*.*(js|json)', {
    cwd: apiPath,
  });

  for (let file of files) {
    loadFile(apis, apiPath, file);
  }

  return apis;
};

const loadAdminApis = async () => {
  let admin = {};
  const adminPath = path.resolve(findPackagePath('strapi-admin'));

  const files = await glob('!(config|node_modules|scripts)//*.*(js|json)', {
    cwd: adminPath,
  });

  for (let file of files) {
    loadFile(admin, adminPath, file);
  }

  return admin;
};

const loadLocalPluginsApis = async appPath => {
  let localPlugins = {};

  const pluginsPath = path.resolve(appPath, 'plugins');

  const files = await glob('*/!(config)/*.*(js|json)', {
    cwd: pluginsPath,
  });

  for (let file of files) {
    loadFile(localPlugins, pluginsPath, file);
  }

  return localPlugins;
};

const loadPluginsApis = async installedPlugins => {
  let plugins = {};
  for (let plugin of installedPlugins) {
    const pluginPath = path.resolve(findPackagePath(plugin));

    const files = await glob(
      '{!(config|node_modules|test)//*.*(js|json),package.json}',
      {
        cwd: pluginPath,
      }
    );

    for (let file of files) {
      loadFile(
        plugins,
        pluginPath,
        file,
        plugin.substr('strapi-plugin-'.length)
      );
    }
  }

  return plugins;
};
