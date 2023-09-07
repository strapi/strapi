import type * as http from 'http';
import type Router from '@koa/router';
import type Koa from 'koa';
import type { Common } from '../types';

export interface HTTPServer extends http.Server {
  destroy: () => Promise<void>;
}

export interface API {
  listRoutes(): Router.Middleware[];
  use: Router['use'];
  routes(routes: Common.Router | Omit<Common.Route, 'info'>[]): this;
  mount(router: Router): this;
}

export interface Server {
  app: Koa;
  router: Router;
  httpServer: HTTPServer;
  api(name: 'content-api'): API;
  api(name: 'admin'): API;
  use: Koa['use'];
  routes(routes: Common.Router | Omit<Common.Route, 'info'>[]): this;
  mount(): this;
  initRouting(): this;
  initMiddlewares(): Promise<this>;
  listRoutes(): Router.Middleware[];
  listen: HTTPServer['listen'];
  destroy(): Promise<void>;
}
