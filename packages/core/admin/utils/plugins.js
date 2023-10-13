'use strict';

const path = require('path');
const fs = require('fs');
const asyncFs = require('fs/promises');
const { camelCase } = require('lodash');
// eslint-disable-next-line import/no-extraneous-dependencies
const glob = require('glob');

/**
 * @typedef {Object} PluginInfo
 * @property {string} packageName
 * @property {string} description
 * @property {boolean=} required
 */

/**
 * @typedef {Object} Plugin
 * @property {string} pathToPlugin
 * @property {string} name
 * @property {PluginInfo} info
 * @property {string=} directory
 */

/**
 * @param {string[]} pluginsAllowlist
 * @returns {Plugin[]}
 */
const getPlugins = (pluginsAllowlist) => {
  const rootPath = path.resolve(__dirname, '..', path.join('..', '..', '..', 'packages'));
  /**
   * So `glob` only supports '/' as a path separator, so we need to replace
   * the path separator for the current OS with '/'. e.g. on windows it's `\`.
   *
   * see https://github.com/isaacs/node-glob/#windows for more information
   *
   * and see https://github.com/isaacs/node-glob/issues/467#issuecomment-1114240501 for the recommended fix.
   */
  let corePath = path.join(rootPath, 'core', '*');
  let pluginsPath = path.join(rootPath, 'plugins', '*');

  if (process.platform === 'win32') {
    corePath = corePath.split(path.sep).join(path.posix.sep);
    pluginsPath = pluginsPath.split(path.sep).join(path.posix.sep);
  }

  const corePackageDirs = glob.sync(corePath);
  const pluginsPackageDirs = glob.sync(pluginsPath);

  const plugins = [...corePackageDirs, ...pluginsPackageDirs]
    .map((directory) => {
      const isCoreAdmin = directory.includes('packages/core/admin');

      if (isCoreAdmin) {
        return null;
      }

      const { name, strapi } = require(path.join(directory, 'package.json'));

      /**
       * this will remove any of our packages that are
       * not actually plugins for the application
       */
      if (!strapi || strapi.kind !== 'plugin') {
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
    .filter(filterPluginsByAdminEntry);

  if (Array.isArray(pluginsAllowlist)) {
    return plugins.filter((plugin) => pluginsAllowlist.includes(plugin.pathToPlugin));
  }

  return plugins;
};

/**
 * @type {(plugin: Plugin) => boolean}
 */
const filterPluginsByAdminEntry = (plugin) => {
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
      path.resolve(`${plugin.pathToPlugin}/strapi-admin.js`)
    );

    if (!isLocalPluginWithLegacyAdminFile) {
      let pathToPlugin = plugin.pathToPlugin;

      if (process.platform === 'win32') {
        pathToPlugin = pathToPlugin.split(path.sep).join(path.posix.sep);
      }

      const isModuleWithFE = require.resolve(`${pathToPlugin}/strapi-admin`);

      return isModuleWithFE;
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
};

/**
 *
 * @param {Plugin[]} plugins
 * @param {string} dest
 * @returns {void}
 */
async function createPluginFile(plugins, dest) {
  const pluginsArray = plugins.map(({ pathToPlugin, name, info }) => {
    const shortName = camelCase(name);

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

  return asyncFs.writeFile(path.resolve(dest, 'admin', 'src', 'plugins.js'), content);
}

/**
 * @param {string[]} pluginsPath – an array of paths to the plugins from the user's directory
 * @returns {RegExp} a regex that will exclude _all_ node_modules except for the plugins in the pluginsPath array.
 */
const createPluginsExcludePath = (pluginsPath = []) => {
  /**
   * If there aren't any plugins in the node_modules array, just return the node_modules regex
   * without complicating it.
   */
  if (pluginsPath.length === 0) {
    return /node_modules/;
  }

  return new RegExp(`node_modules/(?!(${pluginsPath.join('|')}))`);
};

module.exports = {
  getPlugins,
  filterPluginsByAdminEntry,
  createPluginFile,
  createPluginsExcludePath,
};
