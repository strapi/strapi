'use strict';

const { has } = require('lodash/fp');

const pluginsRegistry = strapi => {
  const plugins = {};

  return {
    get(name) {
      return plugins[name];
    },
    getAll() {
      return plugins;
    },
    add(name, pluginConfig) {
      if (has(name, plugins)) {
        throw new Error(`Plugin ${name} has already been registered.`);
      }

      const moduleInstance = strapi.container.get('modules').add(`plugin::${name}`, pluginConfig);
      plugins[name] = moduleInstance;

      return plugins[name];
    },
  };
};

module.exports = pluginsRegistry;
