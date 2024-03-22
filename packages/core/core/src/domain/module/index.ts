import _, { type PropertyPath, flatten } from 'lodash';
import { yup } from '@strapi/utils';
import type { Core, UID, Struct } from '@strapi/types';

import { removeNamespace } from '../../registries/namespace';
import { validateModule } from './validation';

interface LifecyclesState {
  bootstrap?: boolean;
  register?: boolean;
  destroy?: boolean;
}

export interface RawModule {
  config?: Record<string, unknown>;
  routes?: Core.Module['routes'];
  controllers?: Core.Module['controllers'];
  services?: Core.Module['services'];
  contentTypes?: Core.Module['contentTypes'];
  policies?: Core.Module['policies'];
  middlewares?: Core.Module['middlewares'];
  bootstrap?: (params: { strapi: Core.Strapi }) => Promise<void>;
  register?: (params: { strapi: Core.Strapi }) => Promise<void>;
  destroy?: (params: { strapi: Core.Strapi }) => Promise<void>;
}

export interface Module {
  bootstrap: () => Promise<void>;
  register: () => Promise<void>;
  destroy: () => Promise<void>;
  load: () => void;
  routes: Core.Module['routes'];
  config<T = unknown>(key: PropertyPath, defaultVal?: T): T; // TODO: this mirrors ConfigProvider.get, we should use it directly
  contentType: (ctName: UID.ContentType) => Struct.ContentTypeSchema;
  contentTypes: Record<string, Struct.ContentTypeSchema>;
  service: (serviceName: UID.Service) => Core.Service;
  services: Record<string, Core.Service>;
  policy: (policyName: UID.Policy) => Core.Policy;
  policies: Record<string, Core.Policy>;
  middleware: (middlewareName: UID.Middleware) => Core.Middleware;
  middlewares: Record<string, Core.Middleware>;
  controller: (controllerName: UID.Controller) => Core.Controller;
  controllers: Record<string, Core.Controller>;
}

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

export const createModule = (
  namespace: string,
  rawModule: RawModule,
  strapi: Core.Strapi
): Module => {
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
      strapi.get('content-types').add(namespace, rawModule.contentTypes);
      strapi.get('services').add(namespace, rawModule.services);
      strapi.get('policies').add(namespace, rawModule.policies);
      strapi.get('middlewares').add(namespace, rawModule.middlewares);
      strapi.get('controllers').add(namespace, rawModule.controllers);
      strapi.get('config').set(namespace, rawModule.config);
    },
    get routes() {
      return rawModule.routes ?? {};
    },
    config(path: PropertyPath, defaultValue: unknown) {
      const pathArray = flatten([namespace, path]);
      return strapi.get('config').get(pathArray, defaultValue);
    },
    contentType(ctName: UID.ContentType) {
      return strapi.get('content-types').get(`${namespace}.${ctName}`);
    },
    get contentTypes() {
      const contentTypes = strapi.get('content-types').getAll(namespace);
      return removeNamespacedKeys(contentTypes, namespace);
    },
    service(serviceName: UID.Service) {
      return strapi.get('services').get(`${namespace}.${serviceName}`);
    },
    get services() {
      const services = strapi.get('services').getAll(namespace);
      return removeNamespacedKeys(services, namespace);
    },
    policy(policyName: UID.Policy) {
      return strapi.get('policies').get(`${namespace}.${policyName}`);
    },
    get policies() {
      const policies = strapi.get('policies').getAll(namespace);
      return removeNamespacedKeys(policies, namespace);
    },
    middleware(middlewareName: UID.Middleware) {
      return strapi.get('middlewares').get(`${namespace}.${middlewareName}`);
    },
    get middlewares() {
      const middlewares = strapi.get('middlewares').getAll(namespace);
      return removeNamespacedKeys(middlewares, namespace);
    },
    controller(controllerName: UID.Controller) {
      return strapi.get('controllers').get(`${namespace}.${controllerName}`);
    },
    get controllers() {
      const controllers = strapi.get('controllers').getAll(namespace);
      return removeNamespacedKeys(controllers, namespace);
    },
  };
};
