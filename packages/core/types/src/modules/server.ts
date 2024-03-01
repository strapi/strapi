import type * as http from 'http';
import type Router from '@koa/router';
import type Koa from 'koa';
import type * as Core from '../core';

export interface HTTPServer extends http.Server {
  destroy: () => Promise<void>;
}

export interface API {
  listRoutes(): Router.Layer[];
  use(fn: Router.Middleware): API;
  routes(routes: Core.Router | Omit<Core.Route, 'info'>[]): this;
  mount(router: Router): this;
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
  listRoutes(): Router.Layer[];
  listen: HTTPServer['listen'];
  destroy(): Promise<void>;
}
