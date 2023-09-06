'use strict';

const path = require('path');
const fs = require('fs-extra');
const tsUtils = require('@strapi/typescript-utils');
const getCustomAppConfigFile = require('./get-custom-app-config-file');
const { filterPluginsByAdminEntry, createPluginFile } = require('./plugins');

const getPkgPath = (name) => path.dirname(require.resolve(`${name}/package.json`));

async function copyAdmin(dest) {
  const adminPath = getPkgPath('@strapi/admin');

  // TODO copy ee folders for plugins
  await fs.copy(path.resolve(adminPath, 'ee', 'admin'), path.resolve(dest, 'ee', 'admin'));

  await fs.ensureDir(path.resolve(dest, 'config'));
  await fs.copy(path.resolve(adminPath, 'admin'), path.resolve(dest, 'admin'));

  // Copy package.json
  await fs.copy(path.resolve(adminPath, 'package.json'), path.resolve(dest, 'package.json'));
}

async function createCacheDir({ appDir, plugins }) {
  const cacheDir = path.resolve(appDir, '.cache');

  const useTypeScript = await tsUtils.isUsingTypeScript(
    path.join(appDir, 'src', 'admin'),
    'tsconfig.json'
  );

  const pluginsWithFront = Object.entries(plugins)
    .map(([name, plugin]) => ({ name, ...plugin }))
    .filter(filterPluginsByAdminEntry);
  // create .cache dir
  await fs.emptyDir(cacheDir);

  // copy admin core code
  await copyAdmin(cacheDir);

  // Retrieve the custom config file extension
  const customAdminAppConfigFile = await getCustomAppConfigFile(appDir, useTypeScript);

  if (customAdminAppConfigFile) {
    const defaultAdminConfigFilePath = path.resolve(cacheDir, 'admin', 'src', 'app.js');
    const customAdminAppConfigFilePath = path.join(
      appDir,
      'src',
      'admin',
      customAdminAppConfigFile
    );
    const dest = path.resolve(cacheDir, 'admin', 'src', customAdminAppConfigFile);

    if (useTypeScript) {
      // Remove the default config file
      await fs.remove(defaultAdminConfigFilePath);
      // Copy the custom one
      await fs.copy(customAdminAppConfigFilePath, dest);
    } else {
      await fs.copy(customAdminAppConfigFilePath, dest);
    }
  }

  // Copy admin extensions folder
  const adminExtensionFolder = path.join(appDir, 'src', 'admin', 'extensions');

  if (fs.existsSync(adminExtensionFolder)) {
    await fs.copy(adminExtensionFolder, path.resolve(cacheDir, 'admin', 'src', 'extensions'));
  }

  // create plugins.js with plugins requires
  await createPluginFile(pluginsWithFront, cacheDir);

  // create the tsconfig.json file so we can develop plugins in ts while being in a JS project
  if (!useTypeScript) {
    await tsUtils.admin.createTSConfigFile(cacheDir);
  }
}

module.exports = { createCacheDir };
