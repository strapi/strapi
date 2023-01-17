'use strict';

const _ = require('lodash');
const { removeNamespace } = require('../../utils');
const { validateModule } = require('./validation');

const uidToPath = (uid) => uid.replace('::', '.');

// Removes the namespace from a map with keys prefixed with a namespace
const removeNamespacedKeys = (map, namespace) => {
  return _.mapKeys(map, (value, key) => removeNamespace(key, namespace));
};

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
      await (rawModule.bootstrap && rawModule.bootstrap({ strapi }));
    },
    async register() {
      if (called.register) {
        throw new Error(`Register for ${namespace} has already been called`);
      }
      called.register = true;
      await (rawModule.register && rawModule.register({ strapi }));
    },
    async destroy() {
      if (called.destroy) {
        throw new Error(`Destroy for ${namespace} has already been called`);
      }
      called.destroy = true;
      await (rawModule.destroy && rawModule.destroy({ strapi }));
    },
    load() {
      strapi.container.get('content-types').add(namespace, rawModule.contentTypes);
      strapi.container.get('services').add(namespace, rawModule.services);
      strapi.container.get('policies').add(namespace, rawModule.policies);
      strapi.container.get('middlewares').add(namespace, rawModule.middlewares);
      strapi.container.get('controllers').add(namespace, rawModule.controllers);
      strapi.container.get('config').set(uidToPath(namespace), rawModule.config);
    },
    get routes() {
      return rawModule.routes;
    },
    config(path, defaultValue) {
      return strapi.container.get('config').get(`${uidToPath(namespace)}.${path}`, defaultValue);
    },
    contentType(ctName) {
      return strapi.container.get('content-types').get(`${namespace}.${ctName}`);
    },
    get contentTypes() {
      const contentTypes = strapi.container.get('content-types').getAll(namespace);
      return removeNamespacedKeys(contentTypes, namespace);
    },
    service(serviceName) {
      return strapi.container.get('services').get(`${namespace}.${serviceName}`);
    },
    get services() {
      const services = strapi.container.get('services').getAll(namespace);
      return removeNamespacedKeys(services, namespace);
    },
    policy(policyName) {
      return strapi.container.get('policies').get(`${namespace}.${policyName}`);
    },
    get policies() {
      const policies = strapi.container.get('policies').getAll(namespace);
      return removeNamespacedKeys(policies, namespace);
    },
    middleware(middlewareName) {
      return strapi.container.get('middlewares').get(`${namespace}.${middlewareName}`);
    },
    get middlewares() {
      const middlewares = strapi.container.get('middlewares').getAll(namespace);
      return removeNamespacedKeys(middlewares, namespace);
    },
    controller(controllerName) {
      return strapi.container.get('controllers').get(`${namespace}.${controllerName}`);
    },
    get controllers() {
      const controllers = strapi.container.get('controllers').getAll(namespace);
      return removeNamespacedKeys(controllers, namespace);
    },
  };
};

module.exports = { createModule };
