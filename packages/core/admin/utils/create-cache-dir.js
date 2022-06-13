'use strict';

const path = require('path');
const _ = require('lodash');
const fs = require('fs-extra');
const tsUtils = require('@strapi/typescript-utils');
const getCustomAppConfigFile = require('./get-custom-app-config-file');

const getPkgPath = name => path.dirname(require.resolve(`${name}/package.json`));

async function createPluginsJs(plugins, dest) {
  const pluginsArray = plugins.map(({ pathToPlugin, name }) => {
    const shortName = _.camelCase(name);

    /**
     * path.join, on windows, it uses backslashes to resolve path.
     * The problem is that Webpack does not windows paths
     * With this tool, we need to rely on "/" and not "\".
     * This is the reason why '..\\..\\..\\node_modules\\@strapi\\plugin-content-type-builder/strapi-admin.js' was not working.
     * The regexp at line 105 aims to replace the windows backslashes by standard slash so that webpack can deal with them.
     * Backslash looks to work only for absolute paths with webpack => https://webpack.js.org/concepts/module-resolution/#absolute-paths
     */
    const realPath = path
      .join(path.relative(path.resolve(dest, 'admin', 'src'), pathToPlugin), 'strapi-admin.js')
      .replace(/\\/g, '/');

    return {
      name,
      pathToPlugin: realPath,
      shortName,
    };
  });

  const content = `
${pluginsArray
  .map(({ pathToPlugin, shortName }) => {
    const req = `'${pathToPlugin}'`;

    return `import ${shortName} from ${req};`;
  })
  .join('\n')}


const plugins = {
${[...pluginsArray]
  .map(({ name, shortName }) => {
    return `  '${name}': ${shortName},`;
  })
  .join('\n')}
};

export default plugins;
`;

  return fs.writeFile(path.resolve(dest, 'admin', 'src', 'plugins.js'), content);
}

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

  const pluginsWithFront = Object.keys(plugins)
    .filter(pluginName => {
      const pluginInfo = plugins[pluginName];
      return fs.existsSync(path.resolve(pluginInfo.pathToPlugin, 'strapi-admin.js'));
    })
    .map(name => ({ name, ...plugins[name] }));

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
  await createPluginsJs(pluginsWithFront, cacheDir);

  // create the tsconfig.json file so we can develop plugins in ts while being in a JS project
  if (!useTypeScript) {
    await tsUtils.admin.createTSConfigFile(cacheDir);
  }
}

module.exports = createCacheDir;
