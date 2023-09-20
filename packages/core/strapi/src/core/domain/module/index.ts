import _ from 'lodash';
import { yup } from '@strapi/utils';
import type { Strapi, Common, Schema } from '@strapi/types';

import { removeNamespace } from '../../utils';
import { validateModule } from './validation';

interface LifecyclesState {
  bootstrap?: boolean;
  register?: boolean;
  destroy?: boolean;
}

export interface RawModule {
  config?: Record<string, unknown>;
  routes?: Common.Module['routes'];
  controllers?: Common.Module['controllers'];
  services?: Common.Module['services'];
  contentTypes?: Common.Module['contentTypes'];
  policies?: Common.Module['policies'];
  middlewares?: Common.Module['middlewares'];
  bootstrap?: (params: { strapi: Strapi }) => Promise<void>;
  register?: (params: { strapi: Strapi }) => Promise<void>;
  destroy?: (params: { strapi: Strapi }) => Promise<void>;
}

export interface Module {
  bootstrap: () => Promise<void>;
  register: () => Promise<void>;
  destroy: () => Promise<void>;
  load: () => void;
  routes: Common.Module['routes'];
  config: (path: string, defaultValue?: unknown) => unknown;
  contentType: (ctName: Common.UID.ContentType) => Schema.ContentType;
  contentTypes: Record<string, Schema.ContentType>;
  service: (serviceName: Common.UID.Service) => Common.Service;
  services: Record<string, Common.Service>;
  policy: (policyName: Common.UID.Policy) => Common.Policy;
  policies: Record<string, Common.Policy>;
  middleware: (middlewareName: Common.UID.Middleware) => Common.Middleware;
  middlewares: Record<string, Common.Middleware>;
  controller: (controllerName: Common.UID.Controller) => Common.Controller;
  controllers: Record<string, Common.Controller>;
}

const uidToPath = (uid: string) => uid.replace('::', '.');

// Removes the namespace from a map with keys prefixed with a namespace
const removeNamespacedKeys = <T extends Record<string, unknown>>(map: T, namespace: string) => {
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

export const createModule = (namespace: string, rawModule: RawModule, strapi: Strapi): Module => {
  _.defaults(rawModule, defaultModule);

  try {
    validateModule(rawModule);
  } catch (e) {
    if (e instanceof yup.ValidationError) {
      throw new Error(`strapi-server.js is invalid for '${namespace}'.\n${e.errors.join('\n')}`);
    }
  }

  const called: LifecyclesState = {};
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
      return rawModule.routes ?? {};
    },
    config(path: string, defaultValue: unknown) {
      return strapi.container.get('config').get(`${uidToPath(namespace)}.${path}`, defaultValue);
    },
    contentType(ctName: Common.UID.ContentType) {
      return strapi.container.get('content-types').get(`${namespace}.${ctName}`);
    },
    get contentTypes() {
      const contentTypes = strapi.container.get('content-types').getAll(namespace);
      return removeNamespacedKeys(contentTypes, namespace);
    },
    service(serviceName: Common.UID.Service) {
      return strapi.container.get('services').get(`${namespace}.${serviceName}`);
    },
    get services() {
      const services = strapi.container.get('services').getAll(namespace);
      return removeNamespacedKeys(services, namespace);
    },
    policy(policyName: Common.UID.Policy) {
      return strapi.container.get('policies').get(`${namespace}.${policyName}`);
    },
    get policies() {
      const policies = strapi.container.get('policies').getAll(namespace);
      return removeNamespacedKeys(policies, namespace);
    },
    middleware(middlewareName: Common.UID.Middleware) {
      return strapi.container.get('middlewares').get(`${namespace}.${middlewareName}`);
    },
    get middlewares() {
      const middlewares = strapi.container.get('middlewares').getAll(namespace);
      return removeNamespacedKeys(middlewares, namespace);
    },
    controller(controllerName: Common.UID.Controller) {
      return strapi.container.get('controllers').get(`${namespace}.${controllerName}`);
    },
    get controllers() {
      const controllers = strapi.container.get('controllers').getAll(namespace);
      return removeNamespacedKeys(controllers, namespace);
    },
  };
};
