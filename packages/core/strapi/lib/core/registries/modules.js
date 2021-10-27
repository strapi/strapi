'use strict';

const { pickBy, has } = require('lodash/fp');
const { createModule } = require('../domain/module');
const { BaseRegistry } = require('./base');

class ModulesRegistry extends BaseRegistry {
  constructor(strapi) {
    super(strapi);
    this.modules = {};
  }
  get(namespace) {
    return this.modules[namespace];
  }
  getAll(prefix = '') {
    return pickBy((mod, namespace) => namespace.startsWith(prefix))(this.modules);
  }
  add(namespace, rawModule) {
    if (has(namespace, this.modules)) {
      throw new Error(`Module ${namespace} has already been registered.`);
    }

    this.modules[namespace] = createModule(namespace, rawModule, strapi);
    this.modules[namespace].load();

    return this.modules[namespace];
  }
  async bootstrap() {
    for (const mod of Object.values(this.modules)) {
      await mod.bootstrap();
    }
  }
  async register() {
    for (const mod of Object.values(this.modules)) {
      await mod.register();
    }
  }
  async destroy() {
    for (const mod of Object.values(this.modules)) {
      await mod.destroy();
    }
  }
}

const createModulesRegistry = strapi => {
  return new ModulesRegistry(strapi);
};

module.exports = createModulesRegistry;
module.exports.ModulesRegistry = ModulesRegistry;
