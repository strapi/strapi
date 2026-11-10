import type * as http from 'http';
import type { Layer, Router, RouterMiddleware } from '@koa/router';
import type Koa from 'koa';
import type * as Core from '../core';

export interface HTTPServer extends http.Server {
  destroy: () => Promise<void>;
}

/** A route layer Strapi registered. Its path is always a string. */
export type RouteLayer = Omit<Layer, 'path'> & { path: string };

export interface API {
  listRoutes(): RouteLayer[];
  use(fn: RouterMiddleware): API;
  routes(routes: Core.Router | Omit<Core.Route, 'info'>[]): this;
  /** Accepts any router that can `use()` middleware, including `@koa/router` 12. */
  mount(router: { use(...middleware: Koa.Middleware[]): unknown }): this;
}

export interface Server {
  app: Koa;
  router: Router;
  httpServer: HTTPServer;
  api(name: 'content-api'): API;
  api(name: 'admin'): API;
  use(...args: Parameters<Koa['use']>): Server;
  routes(routes: Core.Router | Omit<Core.Route, 'info'>[]): this;
  mount(): this;
  initRouting(): this;
  initMiddlewares(): Promise<this>;
  listRoutes(): RouteLayer[];
  listen: HTTPServer['listen'];
  destroy(): Promise<void>;
}
