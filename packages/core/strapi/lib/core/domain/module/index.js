'use strict';

const _ = require('lodash');
const { validateModule } = require('./validation');

const uidToPath = uid => uid.replace('::', '.');

const defaultModule = {
  config: {},
  routes: [],
  controllers: {},
  services: {},
  contentTypes: {},
  policies: {},
  middlewares: {},
};

const createModule = (namespace, rawModule, strapi) => {
  _.defaults(rawModule, defaultModule);

  try {
    validateModule(rawModule);
  } catch (e) {
    throw new Error(`strapi-server.js is invalid for '${namespace}'.\n${e.errors.join('\n')}`);
  }

  const called = {};
  return {
    async bootstrap() {
      if (called.bootstrap) {
        throw new Error(`Bootstrap for ${namespace} has already been called`);
      }
      called.bootstrap = true;
      await (rawModule.bootstrap && rawModule.bootstrap(strapi));
    },
    async register() {
      if (called.register) {
        throw new Error(`Register for ${namespace} has already been called`);
      }
      called.register = true;
      await (rawModule.register && rawModule.register(strapi));
    },
    async destroy() {
      if (called.destroy) {
        throw new Error(`Destroy for ${namespace} has already been called`);
      }
      called.destroy = true;
      await (rawModule.destroy && rawModule.destroy(strapi));
    },
    load() {
      strapi.container.get('content-types').add(namespace, rawModule.contentTypes);
      strapi.container.get('services').add(namespace, rawModule.services);
      strapi.container.get('policies').add(namespace, rawModule.policies);
      strapi.container.get('middlewares').add(namespace, rawModule.middlewares);
      strapi.container.get('controllers').add(namespace, rawModule.controllers);
      strapi.container.get('config').set(uidToPath(namespace), rawModule.config);
    },
    routes: rawModule.routes,
    config(path) {
      return strapi.container.get('config').get(`${uidToPath(namespace)}.${path}`);
    },
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
      return rawModule.policies;
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
      const map = strapi.container.get('controllers').getAll(namespace);

      // TODO: add removeNamespace in getAll(namespace) in registries
      return _.mapKeys(map, (value, key) => {
        const name = _.last(key.split('.'));
        return name;
      });
    },
  };
};

module.exports = { createModule };
