'use strict';

const _ = require('lodash');

const createRouteScopeGenerator = namespace => route => {
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
 * @param {import('../../').Strapi} strapi
 */
module.exports = strapi => {
  registerAdminRoutes(strapi);
  registerAPIRoutes(strapi);
  registerPluginRoutes(strapi);
};

/**
 * Register admin routes
 * @param {import('../../').Strapi} strapi
 */
const registerAdminRoutes = strapi => {
  const generateRouteScope = createRouteScopeGenerator(`admin::`);

  strapi.admin.routes.forEach(route => {
    generateRouteScope(route);
    route.info = { pluginName: 'admin' };
  });

  strapi.server.routes({
    type: 'admin',
    prefix: '/admin',
    routes: strapi.admin.routes,
  });
};

/**
 * Register plugin routes
 * @param {import('../../').Strapi} strapi
 */
const registerPluginRoutes = strapi => {
  for (const pluginName in strapi.plugins) {
    const plugin = strapi.plugins[pluginName];

    const generateRouteScope = createRouteScopeGenerator(`plugin::${pluginName}`);

    if (Array.isArray(plugin.routes)) {
      plugin.routes.forEach(route => {
        generateRouteScope(route);
        route.info = { pluginName };
      });

      strapi.server.routes({
        type: 'admin',
        prefix: `/${pluginName}`,
        routes: plugin.routes,
      });
    } else {
      _.forEach(plugin.routes, router => {
        router.type = router.type || 'admin';
        router.prefix = `/${pluginName}`;
        router.routes.forEach(route => {
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
 * @param {import('../../').Strapi} strapi
 */
const registerAPIRoutes = strapi => {
  for (const apiName in strapi.api) {
    const api = strapi.api[apiName];

    const generateRouteScope = createRouteScopeGenerator(`api::${apiName}`);

    _.forEach(api.routes, router => {
      // TODO: remove once auth setup
      // pass meta down to compose endpoint
      router.type = 'content-api';
      router.routes.forEach(route => {
        generateRouteScope(route);
        route.info = { apiName };
      });

      return strapi.server.routes(router);
    });
  }
};
