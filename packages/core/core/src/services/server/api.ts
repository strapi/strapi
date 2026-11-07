import Router, { type Layer, type RouterMiddleware } from '@koa/router';
import type Koa from 'koa';
import type { Core } from '@strapi/types';

import { createRouteManager } from './routing';
import { installRoutePathTranslation } from './route-path';

interface Options {
  prefix?: string;
  type?: string;
}

const createAPI = (strapi: Core.Strapi, opts: Options = {}) => {
  const { prefix, type } = opts;

  const api = new Router({ prefix });
  installRoutePathTranslation(api, strapi);

  const routeManager = createRouteManager(strapi, { type });

  return {
    listRoutes() {
      return api.stack.filter(
        (route): route is Layer & { path: string } => typeof route.path === 'string'
      );
    },

    use(fn: RouterMiddleware) {
      api.use(fn);
      return this;
    },

    routes(routes: Core.Router | Core.Route[]) {
      routeManager.addRoutes(routes, api);
      return this;
    },

    mount(router: { use(...middleware: Koa.Middleware[]): unknown }) {
      // The router's middleware type is narrower than Koa's, but it runs as Koa middleware.
      router.use(api.routes() as Koa.Middleware, api.allowedMethods() as Koa.Middleware);
      return this;
    },
  };
};

export { createAPI };
