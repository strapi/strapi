'use strict';

const _ = require('lodash');
const { BaseRegistry } = require('./base');

class ConfigRegistry extends BaseRegistry {
  constructor(strapi, initialConfig) {
    super(strapi);
    this._config = Object.assign({}, initialConfig); // not deep clone because it would break some config;
  }
  get config() {
    return this._config;
  }
  get(path, defaultValue) {
    return _.get(this.config, path, defaultValue);
  }
  set(path, val) {
    _.set(this._config, path, val);
    return this;
  }
  has(path) {
    return _.has(this.config, path);
  }
}

const createConfigRegistry = (strapi, initialConfig = {}) => {
  const configRegistry = new ConfigRegistry(strapi, initialConfig);

  // we use a proxy to map calls from ConfigRegistry().xxx to internal ConfigRegistry().config[xxx] property
  const handler = {
    get: (registry, prop) => (prop in registry.config ? registry.config[prop] : registry[prop]),
  };

  return new Proxy(configRegistry, handler);
};

module.exports = createConfigRegistry;
module.exports.ConfigRegistry = ConfigRegistry;
