import Router from '@koa/router';
import type { Strapi, Common } from '@strapi/types';

import { createRouteManager } from './routing';

interface Options {
  prefix?: string;
  type?: string;
}

const createAPI = (strapi: Strapi, opts: Options = {}) => {
  const { prefix, type } = opts;

  const api = new Router({ prefix });

  const routeManager = createRouteManager(strapi, { type });

  return {
    listRoutes() {
      return [...api.stack];
    },

    use(fn: Router.Middleware) {
      api.use(fn);
      return this;
    },

    routes(routes: Common.Router | Common.Route[]) {
      routeManager.addRoutes(routes, api);
      return this;
    },

    mount(router: Router) {
      router.use(api.routes(), api.allowedMethods());
      return this;
    },
  };
};

export { createAPI };
