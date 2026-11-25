import Router from '@koa/router';
import { has } from 'lodash';
import type { Core } from '@strapi/types';

import { createRouteManager } from './routing';
import { warnLateRegistration } from '../../utils/late-registration';

interface Options {
  prefix?: string;
  type?: string;
}

/** The routes of a router or an array of routes, each with the path the API serves it at. */
const routePathsOf = (apiPrefix: string, routes: Core.Router | Core.RouteInput[]) => {
  if (Array.isArray(routes)) {
    return routes.map((route) => ({ route, path: `${apiPrefix}${route.path}` }));
  }

  return (routes.routes ?? []).map((route) => {
    // Same rule as the route manager: a route with a `config.prefix` skips the router prefix
    const routerPrefix = has(route.config, 'prefix') ? '' : (routes.prefix ?? '');

    return { route, path: `${apiPrefix}${routerPrefix}${route.path}` };
  });
};

const createAPI = (strapi: Core.Strapi, opts: Options = {}) => {
  const { prefix, type } = opts;

  const api = new Router({ prefix });

  const routeManager = createRouteManager(strapi, { type });

  const state = {
    mounted: false,
  };

  /**
   * Development only: warns once per route added after `mount()`. `mount()` copies the routes of
   * this API into the root router, so routes added afterwards are never served.
   */
  const warnAboutRoutesAddedAfterMount = (routes: Core.Router | Core.RouteInput[]) => {
    for (const { route, path } of routePathsOf(prefix ?? '', routes)) {
      const name = `${route.method} ${path}`;

      warnLateRegistration(strapi, {
        surface: 'server-api-routes',
        key: JSON.stringify([type, name]),
        subject: `Route "${name}" of the ${type} API`,
        closedBy:
          'the server mounted the API routers (server.mount(), when the server starts listening)',
        effect: 'Strapi does not serve it',
        registerIn:
          'before the server starts listening, for example from a register or bootstrap function',
      });
    }
  };

  return {
    listRoutes() {
      return [...api.stack];
    },

    use(fn: Router.Middleware) {
      api.use(fn);
      return this;
    },

    routes(routes: Core.Router | Core.Route[]) {
      routeManager.addRoutes(routes, api);

      if (state.mounted === true) {
        warnAboutRoutesAddedAfterMount(routes);
      }

      return this;
    },

    mount(router: Router) {
      state.mounted = true;

      router.use(api.routes(), api.allowedMethods());
      return this;
    },
  };
};

export { createAPI };
