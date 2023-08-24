'use strict';

const NODE_MODULES = 'node_modules';
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

  return new RegExp(`${NODE_MODULES}/(?!(${pluginsPath.join('|')}))`);
};

module.exports = { createPluginsExcludePath };
