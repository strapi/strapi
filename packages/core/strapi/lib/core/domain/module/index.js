'use strict';

const { validateModule } = require('./validation');

const createModule = (namespace, rawModule, strapi) => {
  try {
    validateModule(rawModule);
  } catch (e) {
    throw new Error(`strapi-server.js is invalid for plugin ${namespace}.\n${e.errors.join('\n')}`);
  }

  const loaded = [];
  return {
    async bootstrap() {
      if (loaded.includes('bootstrap')) {
        throw new Error(`Bootstrap for ${namespace} has already been called`);
      }
      loaded.push('bootstrap');
      await rawModule.bootstrap(strapi);
    },
    async register() {
      if (loaded.includes('register')) {
        throw new Error(`Register for ${namespace} has already been called`);
      }
      loaded.push('register');
      await rawModule.register(strapi);
    },
    async destroy() {
      if (loaded.includes('destroy')) {
        throw new Error(`Destroy for ${namespace} has already been called`);
      }
      loaded.push('destroy');
      await rawModule.destroy(strapi);
    },
    load() {
      strapi.container.get('content-types').add(namespace, rawModule.contentTypes);
      strapi.container.get('services').add(namespace, rawModule.services);
      strapi.container.get('policies').add(namespace, rawModule.policies);
      strapi.container.get('middlewares').add(namespace, rawModule.middlewares);
      strapi.container.get('controllers').add(namespace, rawModule.controllers);
      strapi.container.get('config').set(namespace.replace('::', '.'), rawModule.config);
    },
    routes: rawModule.routes, // TODO: to remove v3
    contentType(ctName) {
      return strapi.container.get('content-types').get(`${namespace}.${ctName}`);
    },
    get contentTypes() {
      return strapi.container.get('content-types').getAll(namespace);
    },
    service(serviceName) {
      return strapi.container.get('services').get(`${namespace}.${serviceName}`);
    },
    get services() {
      return strapi.container.get('services').getAll(namespace);
    },
    policy(policyName) {
      return strapi.container.get('policies').get(`${namespace}.${policyName}`);
    },
    get policies() {
      return strapi.container.get('policies').getAll(namespace);
    },
    middleware(middlewareName) {
      return strapi.container.get('middlewares').get(`${namespace}.${middlewareName}`);
    },
    get middlewares() {
      return strapi.container.get('middlewares').getAll(namespace);
    },
    controller(controllerName) {
      return strapi.container.get('controllers').get(`${namespace}.${controllerName}`);
    },
    get controllers() {
      return strapi.container.get('controllers').getAll(namespace);
    },
  };
};

module.exports = { createModule };
