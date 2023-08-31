'use strict';

const { join, resolve, sep, posix } = require('path');
const fs = require('fs');
// eslint-disable-next-line import/no-extraneous-dependencies
const glob = require('glob');

const getPlugins = (pluginsAllowlist) => {
  const rootPath = resolve(__dirname, '..', join('..', '..', '..', 'packages'));
  /**
   * So `glob` only supports '/' as a path separator, so we need to replace
   * the path separator for the current OS with '/'. e.g. on windows it's `\`.
   *
   * see https://github.com/isaacs/node-glob/#windows for more information
   *
   * and see https://github.com/isaacs/node-glob/issues/467#issuecomment-1114240501 for the recommended fix.
   */
  let corePath = join(rootPath, 'core', '*');
  let pluginsPath = join(rootPath, 'plugins', '*');

  if (process.platform === 'win32') {
    corePath = corePath.split(sep).join(posix.sep);
    pluginsPath = pluginsPath.split(sep).join(posix.sep);
  }

  const corePackageDirs = glob.sync(corePath);
  const pluginsPackageDirs = glob.sync(pluginsPath);

  const plugins = [...corePackageDirs, ...pluginsPackageDirs]
    .map((directory) => {
      const isCoreAdmin = directory.includes('packages/core/admin');

      if (isCoreAdmin) {
        return null;
      }

      const { name, strapi } = require(join(directory, 'package.json'));

      /**
       * this will remove any of our packages that are
       * not actually plugins for the application
       */
      if (!strapi) {
        return null;
      }

      /**
       * we want the name of the node_module
       */
      return {
        pathToPlugin: name,
        name: strapi.name,
        info: { ...strapi, packageName: name },
        directory,
      };
    })
    .filter((plugin) => {
      if (!plugin) {
        return false;
      }

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
          resolve(`${plugin.pathToPlugin}/strapi-admin.js`)
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
    });

  if (Array.isArray(pluginsAllowlist)) {
    return plugins.filter((plugin) => pluginsAllowlist.includes(plugin.pathToPlugin));
  }

  return plugins;
};

module.exports = { getPlugins };
