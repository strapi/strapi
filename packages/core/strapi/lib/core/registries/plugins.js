'use strict';

const { has } = require('lodash/fp');
const { BaseRegistry } = require('./base');

class PluginsRegistry extends BaseRegistry {
  constructor(strapi) {
    super(strapi);
    this.plugins = {};
  }
  get(name) {
    return this.plugins[name];
  }
  getAll() {
    return this.plugins;
  }
  add(name, pluginConfig) {
    if (has(name, this.plugins)) {
      throw new Error(`Plugin ${name} has already been registered.`);
    }

    const pluginModule = strapi.container.get('modules').add(`plugin::${name}`, pluginConfig);
    this.plugins[name] = pluginModule;

    return this.plugins[name];
  }
}

const createPluginsRegistry = strapi => {
  return new PluginsRegistry(strapi);
};

module.exports = createPluginsRegistry;
module.exports.PluginsRegistry = PluginsRegistry;
