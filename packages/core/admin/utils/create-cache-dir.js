'use strict';

const path = require('path');
const _ = require('lodash');
const fs = require('fs-extra');
const tsUtils = require('@strapi/typescript-utils');
const getCustomAppConfigFile = require('./get-custom-app-config-file');

const getPkgPath = (name) => path.dirname(require.resolve(`${name}/package.json`));

async function createPluginsJs(plugins, dest) {
  const pluginsArray = plugins.map(({ pathToPlugin, name, info }) => {
    const shortName = _.camelCase(name);

    let realPath = '';

    /**
     * We're using a module here so we want to keep using the module resolution procedure.
     */
    if (info?.packageName || info?.required) {
      /**
       * path.join, on windows, it uses backslashes to resolve path.
       * The problem is that Webpack does not windows paths
       * With this tool, we need to rely on "/" and not "\".
       * This is the reason why '..\\..\\..\\node_modules\\@strapi\\plugin-content-type-builder/strapi-admin.js' was not working.
       * The regexp at line 105 aims to replace the windows backslashes by standard slash so that webpack can deal with them.
       * Backslash looks to work only for absolute paths with webpack => https://webpack.js.org/concepts/module-resolution/#absolute-paths
       */
      realPath = path.join(pathToPlugin, 'strapi-admin').replace(/\\/g, '/');
    } else {
      realPath = path
        .join(path.relative(path.resolve(dest, 'admin', 'src'), pathToPlugin), 'strapi-admin')
        .replace(/\\/g, '/');
    }

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

  const pluginsWithFront = Object.entries(plugins)
    .filter(([, plugin]) => {
      /**
       * There are two ways a plugin should be imported, either it's local to the strapi app,
       * or it's an actual npm module that's installed and resolved via node_modules.
       *
       * We first check if the plugin is local to the strapi app, using a regular `resolve` because
       * the pathToPlugin will be relative i.e. `/Users/my-name/strapi-app/src/plugins/my-plugin`.
       *
       * If the file doesn't exist well then it's probably a node_module, so instead we use `require.resolve`
       * which will resolve the path to the module in node_modules. If it fails with the specific code `MODULE_NOT_FOUND`
       * then it doesn't have an admin part to the package.
       *
       * NOTE: we should try to move to `./package.json[exports]` map with bundling of our own plugins,
       * because these entry files are written in commonjs restricting features e.g. tree-shaking.
       */
      try {
        const isLocalPluginWithLegacyAdminFile = fs.existsSync(
          path.resolve(`${plugin.pathToPlugin}/strapi-admin.js`)
        );

        if (!isLocalPluginWithLegacyAdminFile) {
          const isModulewithLegacyAdminFile = require.resolve(
            `${plugin.pathToPlugin}/strapi-admin.js`
          );

          return isModulewithLegacyAdminFile;
        }

        return isLocalPluginWithLegacyAdminFile;
      } catch (err) {
        if (err.code === 'MODULE_NOT_FOUND') {
          /**
           * the plugin does not contain FE code, so we
           * don't want to import it anyway
           */
          return false;
        }

        throw err;
      }
    })
    .map(([name, plugin]) => ({ name, ...plugin }));

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

module.exports = { createCacheDir, createPluginsJs };
