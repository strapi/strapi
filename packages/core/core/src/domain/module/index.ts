import _ from 'lodash';
import { yup } from '@strapi/utils';
import type { Core, Public, Internal } from '@strapi/types';

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
  config: (path: string, defaultValue?: unknown) => unknown;
  contentType: (ctName: Public.UID.ContentType) => Internal.Struct.ContentTypeSchema;
  contentTypes: Record<string, Internal.Struct.ContentTypeSchema>;
  service: (serviceName: Public.UID.Service) => Core.Service;
  services: Record<string, Core.Service>;
  policy: (policyName: Public.UID.Policy) => Core.Policy;
  policies: Record<string, Core.Policy>;
  middleware: (middlewareName: Public.UID.Middleware) => Core.Middleware;
  middlewares: Record<string, Core.Middleware>;
  controller: (controllerName: Public.UID.Controller) => Core.Controller;
  controllers: Record<string, Core.Controller>;
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
      strapi.get('config').set(uidToPath(namespace), rawModule.config);
    },
    get routes() {
      return rawModule.routes ?? {};
    },
    config(path: string, defaultValue: unknown) {
      return strapi.get('config').get(`${uidToPath(namespace)}.${path}`, defaultValue);
    },
    contentType(ctName: Public.UID.ContentType) {
      return strapi.get('content-types').get(`${namespace}.${ctName}`);
    },
    get contentTypes() {
      const contentTypes = strapi.get('content-types').getAll(namespace);
      return removeNamespacedKeys(contentTypes, namespace);
    },
    service(serviceName: Public.UID.Service) {
      return strapi.get('services').get(`${namespace}.${serviceName}`);
    },
    get services() {
      const services = strapi.get('services').getAll(namespace);
      return removeNamespacedKeys(services, namespace);
    },
    policy(policyName: Public.UID.Policy) {
      return strapi.get('policies').get(`${namespace}.${policyName}`);
    },
    get policies() {
      const policies = strapi.get('policies').getAll(namespace);
      return removeNamespacedKeys(policies, namespace);
    },
    middleware(middlewareName: Public.UID.Middleware) {
      return strapi.get('middlewares').get(`${namespace}.${middlewareName}`);
    },
    get middlewares() {
      const middlewares = strapi.get('middlewares').getAll(namespace);
      return removeNamespacedKeys(middlewares, namespace);
    },
    controller(controllerName: Public.UID.Controller) {
      return strapi.get('controllers').get(`${namespace}.${controllerName}`);
    },
    get controllers() {
      const controllers = strapi.get('controllers').getAll(namespace);
      return removeNamespacedKeys(controllers, namespace);
    },
  };
};
