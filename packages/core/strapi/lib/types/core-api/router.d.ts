import type { Common, Strapi, Utils } from '@strapi/strapi';

import { ExtendableContext } from 'koa';
import { Middleware as KoaMiddleware } from 'koa';

export type MiddlewareFactory = (config: any, ctx: { strapi: Strapi }) => Middleware | null;

export type Middleware = KoaMiddleware | MiddlewareFactory;

export interface PolicyContext extends ExtendableContext {
  type: string;
}

export type PolicyImplementation<T = unknown> = (
  ctx: PolicyContext,
  cfg: T,
  { strapi }: { strapi: Strapi }
) => boolean | undefined;

type HandlerConfig = {
  auth?: false | { scope: string[] };
  policies?: Array<string | PolicyImplementation | { name: string; config: object }>;
  middlewares?: Array<string | Middleware | { name: string; config: object }>;
};

export type Generic = {
  [method: string | number | symbol]: HandlerConfig;
};

export type SingleTypeRouterConfig = Generic & {
  find?: HandlerConfig;
  update?: HandlerConfig;
  delete?: HandlerConfig;
};

export type CollectionTypeRouterConfig = Generic & {
  find?: HandlerConfig;
  findOne?: HandlerConfig;
  create?: HandlerConfig;
  update?: HandlerConfig;
  delete?: HandlerConfig;
};

export type RouterConfig<T extends Common.UID.ContentType> = {
  prefix?: string;
  // TODO Refactor when we have a controller registry
  only?: string[];
  except?: string[];
  config: Utils.Expression.IfElse<
    Common.UID.IsCollectionType<T>,
    CollectionTypeRouterConfig,
    SingleTypeRouterConfig
  >;
};

export type Route = {
  method: string;
  path: string;
};
export type Router = {
  prefix: string;
  routes: Route[];
};
