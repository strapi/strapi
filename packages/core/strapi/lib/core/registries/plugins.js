'use strict';

/**
 * @typedef {import('@strapi/strapi').Strapi} Strapi
 * @typedef {import('@strapi/strapi').StrapiPlugins} StrapiPlugins
 */

const { has } = require('lodash/fp');

/**
 * @param {Strapi} strapi
 */
const pluginsRegistry = strapi => {
  /**
   * @type {StrapiPlugins}
   */
  // @ts-ignore
  const plugins = {};

  return {
    /**
     * @template {keyof StrapiPlugins} T
     * @param {T} name
     */
    get(name) {
      return plugins[name];
    },
    getAll() {
      return plugins;
    },
    /**
     * @template {keyof StrapiPlugins} T
     * @param {T} name
     * @param {any=} pluginConfig
     */
    add(name, pluginConfig) {
      if (has(name, plugins)) {
        throw new Error(`Plugin ${name} has already been registered.`);
      }

      // @ts-ignore
      const pluginModule = strapi.container.get('modules').add(`plugin::${name}`, pluginConfig);

      // @ts-ignore
      plugins[name] = pluginModule;

      return plugins[name];
    },
  };
};

module.exports = pluginsRegistry;
