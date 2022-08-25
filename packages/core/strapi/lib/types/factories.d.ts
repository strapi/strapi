import { Service,GenericService } from '../core-api/service';
import { Controller, GenericController } from '../core-api/controller';
import { Middleware } from '../middlewares';
import { Policy } from '../core/registries/policies';
import { Strapi } from '@strapi/strapi';

/**
 * Map of UID / services.
 * It can be extended by the user application or plugins.
 * 
 * @example
 * ```ts
 * declare module '@strapi/strapi/lib/types/core/factories' {
 *   export interface ServiceUidMap {
 *     'xxx::xxx.uid': SingleTypeService;
 *     'yyy::yyy.uid': CollectionTypeService;
 *   }
 * }
 * ```
 */
export interface ServiceUidMap {
  [key: string]: Service;
}

/**
 * Map of UID / controllers.
 * It can be extended by the user application or plugins.
 * 
 * @example
 * ```ts
 * declare module '@strapi/strapi/lib/types/core/factories' {
 *   export interface ControllerUidMap {
 *     'xxx::xxx.uid': Controller;
 *   }
 * }
 * ```
 */
export interface ControllerUidMap {
  [key: string]: Controller;
}

export interface HandlerConfig {
  auth?: false | { scope: string[] };
  policies?: Array<string | Policy | { name: string; config: object }>;
  middlewares?: Array<string | Middleware | { name: string; config: object }>;
};

export interface SingleTypeRouterConfig {
  find?: HandlerConfig;
  update?: HandlerConfig;
  delete?: HandlerConfig;
};

export interface CollectionTypeRouterConfig {
  find?: HandlerConfig;
  findOne?: HandlerConfig;
  create?: HandlerConfig;
  update?: HandlerConfig;
  delete?: HandlerConfig;
};

export type RouterConfig = {
  prefix?: string;
  only: string[];
  except?: string[];
  config: SingleTypeRouterConfig | CollectionTypeRouterConfig;
};

export interface Route {
  method: string;
  path: string;
}
export interface Router {
  prefix: string;
  routes: Route[];
}

export type CustomActions =
  | undefined
  | (({ strapi }: { strapi: Strapi }) => any)
  | { [key: string]: any };

export function createCoreRouter(uid: string, cfg?: RouterConfig = {}): () => Router;

export function createCoreController<K extends keyof ControllerUidMap, T extends CustomActions>(
  uid: K,
  customActions?: T
): T extends undefined
  ? () => ControllerUidMap[K] // only base controller
  : T extends (...args: any) => any // custom action is function ? ({ strapi }) => ({})
  ? () => ReturnType<T> & ControllerUidMap[K] // merge custom action return type with base controller
  : () => T & ControllerUidMap[K]; // merge custom action object with base controller

export function createCoreService<K extends keyof ServiceUidMap, T extends CustomActions>(
  uid: K,
  customActions?: T
): T extends undefined
  ? () => ServiceUidMap[K] // only base service
  : T extends (...args: any) => any // custom action is function ? ({ strapi }) => ({})
  ? () => ReturnType<T> & ServiceUidMap[K] // merge custom action return type with base service
  : () => T & ServiceUidMap[K]; // merge custom action object with base service