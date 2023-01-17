'use strict';

const { join, resolve, relative } = require('path');
const { camelCase } = require('lodash');
const fs = require('fs-extra');

const CORE_PLUGINS = ['content-type-builder', 'email', 'upload'];

/**
 * Retrieve the core plugins path
 * @returns {Object}
 */
const getCorePluginsPath = () => {
  const corePlugins = {};

  for (const dep of CORE_PLUGINS) {
    const packageAdminPath = join(__dirname, '..', '..', dep, 'admin', 'src');

    const adminEntryPoint = resolve(join(__dirname, '..', 'admin', 'src'));
    const pathToPlugin = join(relative(adminEntryPoint, packageAdminPath)).replace(/\\/g, '/');

    corePlugins[dep] = pathToPlugin;
  }

  return corePlugins;
};

/**
 * Retrieve the plugins real path
 * @param {Object[]} pluginsToInstall array of plugins located in the plugins folder
 * @returns Object of plugin's paths
 */
const getPluginToInstallPath = (pluginsToInstall) => {
  const plugins = {};

  for (const dep of pluginsToInstall) {
    const packageAdminPath = join(__dirname, '..', '..', '..', 'plugins', dep, 'admin', 'src');

    const adminEntryPoint = resolve(join(__dirname, '..', 'admin', 'src'));
    const pathToPlugin = join(relative(adminEntryPoint, packageAdminPath)).replace(/\\/g, '/');

    plugins[dep] = pathToPlugin;
  }

  return plugins;
};

/**
 * Write the plugins.js file
 * @param {Object} plugins
 */
const createPluginsFile = async (plugins) => {
  const pluginFileDest = resolve(__dirname, '..', 'admin', 'src', 'plugins.js');

  const allPluginsArray = Object.entries(plugins).map(([plugin, pluginPath]) => {
    return {
      shortName: camelCase(plugin),
      name: plugin,
      pluginPath,
    };
  });

  const content = `
// To override this file create a plugins-dev.js one and copy the content of the plugin.js one.
// When starting the app the script will copy the plugins-dev.js into this one instead.
${allPluginsArray
  .map(({ shortName, pluginPath }) => {
    const req = `'${pluginPath}'`;

    return `import ${shortName} from ${req};`;
  })
  .join('\n')}

const plugins = {
${[...allPluginsArray]
  .map(({ name, shortName }) => {
    return `  '${name}': ${shortName},`;
  })
  .join('\n')}
};
  
export default plugins;
`;

  return fs.writeFile(pluginFileDest, content);
};

module.exports = {
  createPluginsFile,
  getCorePluginsPath,
  getPluginToInstallPath,
};
