import _ from 'lodash';
import type { Core } from '@strapi/types';

const createRouteScopeGenerator = (namespace: string) => (route: Core.RouteInput) => {
  const prefix = namespace.endsWith('::') ? namespace : `${namespace}.`;

  if (typeof route.handler === 'string') {
    _.defaultsDeep(route, {
      config: {
        auth: {
          scope: [`${route.handler.startsWith(prefix) ? '' : prefix}${route.handler}`],
        },
      },
    });
  }
};

/**
 * Register all routes
 */
export default (strapi: Core.Strapi) => {
  registerAdminRoutes(strapi);
  registerAPIRoutes(strapi);
  registerPluginRoutes(strapi);
};

/**
 * Register admin routes
 * @param {import('../../').Strapi} strapi
 */
const registerAdminRoutes = (strapi: Core.Strapi) => {
  const generateRouteScope = createRouteScopeGenerator(`admin::`);

  _.forEach(strapi.admin.routes, (router) => {
    router.type = router.type || 'admin';
    router.prefix = router.prefix || `/admin`;
    router.routes.forEach((route) => {
      generateRouteScope(route);
      route.info = { pluginName: 'admin' };
    });
    strapi.server.routes(router);
  });
};

/**
 * Register plugin routes
 * @param {import('../../').Strapi} strapi
 */
const registerPluginRoutes = (strapi: Core.Strapi) => {
  for (const pluginName of Object.keys(strapi.plugins)) {
    const plugin = strapi.plugins[pluginName];

    const generateRouteScope = createRouteScopeGenerator(`plugin::${pluginName}`);

    if (Array.isArray(plugin.routes)) {
      plugin.routes.forEach((route) => {
        generateRouteScope(route);
        route.info = { pluginName };
      });

      strapi.server.routes({
        type: 'admin',
        prefix: `/${pluginName}`,
        routes: plugin.routes,
      });
    } else {
      _.forEach(plugin.routes, (router) => {
        router.type = router.type || 'admin';
        router.prefix = router.prefix || `/${pluginName}`;
        router.routes.forEach((route) => {
          generateRouteScope(route);
          route.info = { pluginName };
        });

        strapi.server.routes(router);
      });
    }
  }
};

/**
 * Register api routes
 */
const registerAPIRoutes = (strapi: Core.Strapi) => {
  for (const apiName of Object.keys(strapi.apis)) {
    const api = strapi.api(apiName);

    const generateRouteScope = createRouteScopeGenerator(`api::${apiName}`);

    _.forEach(api.routes, (router) => {
      // TODO: remove once auth setup
      // pass meta down to compose endpoint
      router.type = 'content-api';
      router.routes?.forEach((route) => {
        generateRouteScope(route);
        route.info = { apiName };
      });

      return strapi.server.routes(router);
    });
  }
};
