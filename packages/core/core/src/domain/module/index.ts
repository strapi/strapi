import _, { type PropertyPath, flatten } from 'lodash';
import { yup } from '@strapi/utils';
import type { Core, UID, Struct } from '@strapi/types';

import type { ControllerFactory } from '../../registries/controllers';
import { removeNamespace } from '../../registries/namespace';
import type { ServiceFactory } from '../../registries/services';
import { validateModule } from './validation';

interface LifecyclesState {
  bootstrap?: boolean;
  register?: boolean;
  destroy?: boolean;
}

/**
 * Routers keyed by name: a router, or a factory called with `{ strapi }` when the routes are
 * registered (`services/server/register-routes.ts`), as plugins declare them.
 */
type ModuleRoutes = Record<string, Core.RouterConfig>;

export interface RawModule {
  config?: Record<string, unknown>;
  routes?: ModuleRoutes;
  // Registered as is: the registries call a factory once, with `{ strapi }`.
  controllers?: Record<string, ControllerFactory>;
  services?: Record<string, ServiceFactory>;
  contentTypes?: Core.Module['contentTypes'];
  policies?: Core.Module['policies'];
  middlewares?: Core.Module['middlewares'];
  // `createModule` awaits the result: a lifecycle may be synchronous.
  bootstrap?: (params: { strapi: Core.Strapi }) => void | Promise<void>;
  register?: (params: { strapi: Core.Strapi }) => void | Promise<void>;
  destroy?: (params: { strapi: Core.Strapi }) => void | Promise<void>;
}

export interface Module {
  bootstrap: () => Promise<void>;
  register: () => Promise<void>;
  destroy: () => Promise<void>;
  isDestroyed: () => boolean;
  load: () => void;
  routes: ModuleRoutes;
  config<T = unknown>(key: PropertyPath, defaultVal?: T): T; // TODO: this mirrors ConfigProvider.get, we should use it directly
  contentType: (ctName: UID.ContentType) => Struct.ContentTypeSchema;
  contentTypes: Record<string, Struct.ContentTypeSchema>;
  /** `undefined` when no service is registered under the name, as the services registry's `get`. */
  service: (serviceName: UID.Service) => Core.Service | undefined;
  services: Record<string, Core.Service>;
  /** `undefined` when no policy is registered under the name, as the policies registry's `get`. */
  policy: (policyName: UID.Policy) => Core.Policy | undefined;
  policies: Record<string, Core.Policy>;
  middleware: (middlewareName: UID.Middleware) => Core.Middleware;
  middlewares: Record<string, Core.Middleware>;
  /** `undefined` when no controller is registered under the name, as the controllers registry's `get`. */
  controller: (controllerName: UID.Controller) => Core.Controller | undefined;
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
      try {
        await (rawModule.destroy && rawModule.destroy({ strapi }));
      } catch (error) {
        called.destroy = false;
        throw error;
      }
    },
    isDestroyed() {
      return called.destroy === true;
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
    set routes(routes: ModuleRoutes) {
      rawModule.routes = routes;
    },
    config<T = unknown>(path: PropertyPath, defaultValue?: T): T {
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
