'use strict';

const { sep, join } = require('path');

const NODE_MODULES = 'node_modules';
/**
 * @param {string[]} pluginsPath – an array of paths to the plugins from the user's directory
 * @returns {RegExp} a regex that will exclude _all_ node_modules except for the plugins in the pluginsPath array.
 */
const createPluginsExcludePath = (pluginsPath = []) => {
  /**
   * converts the full path to just the plugin path
   * e.g. `/Users/username/strapi/node_modules/@scope/plugin-name`
   * to `@scope/plugin-name`
   */
  const tsxPlugins = pluginsPath.reduce((acc, curr) => {
    const dirPaths = curr.split(sep);

    const nodeModulePathIndex = dirPaths.findIndex((val) => val === NODE_MODULES);

    if (nodeModulePathIndex > 0) {
      const pluginNodeModulePath = dirPaths.slice(nodeModulePathIndex + 1);
      return [...acc, join(...pluginNodeModulePath)];
    }

    return acc;
  }, []);

  /**
   * If there aren't any plugins in the node_modules array, just return the node_modules regex
   * without complicating it.
   */
  if (tsxPlugins.length === 0) {
    return /node_modules/;
  }

  return new RegExp(`${NODE_MODULES}/(?!(${tsxPlugins.join('|')}))`);
};

module.exports = createPluginsExcludePath;
