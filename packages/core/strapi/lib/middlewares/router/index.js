'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const Router = require('@koa/router');
const createEndpointComposer = require('./utils/compose-endpoint');

module.exports = strapi => {
  const composeEndpoint = createEndpointComposer(strapi);

  const registerAdminRoutes = () => {
    const router = new Router({ prefix: '/admin' });

    for (const route of strapi.admin.routes) {
      composeEndpoint(route, { pluginName: 'admin', router });
    }

    strapi.server.use(router.routes()).use(router.allowedMethods());
  };

  const registerPluginRoutes = () => {
    for (const pluginName in strapi.plugins) {
      const plugin = strapi.plugins[pluginName];

      for (const route of plugin.routes || []) {
        const hasPrefix = _.has(route.config, 'prefix');

        if (!hasPrefix) {
          route.path = `/${pluginName}${route.path}`;
        }

        route.info = { pluginName };
      }

      strapi.server.routes(plugin.routes || []);
    }
  };

  const registerAPIRoutes = () => {
    for (const apiName in strapi.api) {
      const api = strapi.api[apiName];

      _.forEach(api.routes, routeInfo => {
        // TODO: remove once auth setup
        // pass meta down to compose endpoint
        routeInfo.routes.forEach(route => {
          route.info = { apiName };
        });

        return strapi.server.api('content-api').routes(routeInfo);
      });
    }
  };

  return {
    initialize() {
      registerAPIRoutes();
      registerAdminRoutes();
      registerPluginRoutes();
    },
  };
};
