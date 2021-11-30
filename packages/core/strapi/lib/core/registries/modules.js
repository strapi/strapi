'use strict';

const { pickBy, has } = require('lodash/fp');
const { createModule } = require('../domain/module');

const modulesRegistry = strapi => {
  const modules = {};

  return {
    get(namespace) {
      return modules[namespace];
    },
    getAll(prefix = '') {
      return pickBy((mod, namespace) => namespace.startsWith(prefix))(modules);
    },
    add(namespace, rawModule) {
      if (has(namespace, modules)) {
        throw new Error(`Module ${namespace} has already been registered.`);
      }

      modules[namespace] = createModule(namespace, rawModule, strapi);
      modules[namespace].load();

      return modules[namespace];
    },
    async bootstrap() {
      for (const mod of Object.values(modules)) {
        await mod.bootstrap();
      }
    },
    async register() {
      for (const mod of Object.values(modules)) {
        await mod.register();
      }
    },
    async destroy() {
      for (const mod of Object.values(modules)) {
        await mod.destroy();
      }
    },
  };
};

module.exports = modulesRegistry;
