'use strict';

const { join, resolve, relative } = require('path');
const { promisify } = require('util');

// eslint-disable-next-line import/no-extraneous-dependencies
const glob = promisify(require('glob').glob);
const fs = require('fs-extra');
const { getCorePluginsPath, createPluginsFile } = require('./create-plugins-file');

/**
 * Retrieve all plugins that are inside the plugins folder
 * @returns Object the plugins
 */
const getPluginsPackages = async () => {
  const pathToPackages = resolve(__dirname, '..', '..', '..', 'plugins', '*');
  const pluginsPackageDirs = await glob(pathToPackages);

  return pluginsPackageDirs
    .filter((pluginDir) => {
      return fs.existsSync(join(pluginDir, 'admin', 'src', 'index.js'));
    })
    .reduce((acc, current) => {
      const depName = current.replace(/\\/g, '/').split('/').slice(-1)[0];

      const adminEntryPoint = join(__dirname, '..', 'admin', 'src');

      const pathToPlugin = join(relative(adminEntryPoint, current), 'admin', 'src').replace(
        /\\/g,
        '/'
      );

      acc[depName] = pathToPlugin;

      return acc;
    }, {});
};

/**
 * Write the plugins.js file or copy the plugins-dev.js file if it exists
 */
const createFile = async () => {
  const customPluginFile = join(__dirname, '..', 'admin', 'src', 'plugins-dev.js');
  const pluginFileDest = join(__dirname, '..', 'admin', 'src', 'plugins.js');

  if (fs.existsSync(customPluginFile)) {
    await fs.copy(customPluginFile, pluginFileDest);

    return;
  }

  const corePlugins = getCorePluginsPath();
  const plugins = await getPluginsPackages();
  const allPlugins = { ...corePlugins, ...plugins };

  return createPluginsFile(allPlugins);
};

createFile()
  .then(() => {
    console.log('plugins.js file created');
    process.exit();
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
