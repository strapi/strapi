'use strict';

/**
 * @typedef {import('types').Strapi} Strapi
 */

const { has } = require('lodash/fp');

/**
 * @param {Strapi} strapi
 */
const pluginsRegistry = strapi => {
  /**
   * @type {Record<string, any>}
   */
  const plugins = {};

  return {
    /**
     * @param {string} name
     */
    get(name) {
      return plugins[name];
    },
    getAll() {
      return plugins;
    },
    /**
     * @param {string} name
     * @param {any=} pluginConfig
     */
    add(name, pluginConfig) {
      if (has(name, plugins)) {
        throw new Error(`Plugin ${name} has already been registered.`);
      }

      const pluginModule = strapi.container.get('modules').add(`plugin::${name}`, pluginConfig);
      plugins[name] = pluginModule;

      return plugins[name];
    },
  };
};

module.exports = pluginsRegistry;
