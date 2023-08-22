'use strict';

const { join } = require('path');
const fs = require('fs-extra');
const { getPlugins } = require('../utils/get-plugins');
const { createPluginsJs } = require('../utils/create-cache-dir');

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

  const plugins = getPlugins();

  return createPluginsJs(plugins, join(__dirname, '..'));
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
