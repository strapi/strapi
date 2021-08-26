'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const Router = require('koa-router');
const createEndpointComposer = require('./utils/composeEndpoint');

module.exports = strapi => {
  const composeEndpoint = createEndpointComposer(strapi);

  const registerAdminRoutes = () => {
    const router = new Router({ prefix: '/admin' });

    for (const route of strapi.admin.routes) {
      composeEndpoint(route, { pluginName: 'admin', router });
    }

    strapi.app.use(router.routes()).use(router.allowedMethods());
  };

  const registerPluginRoutes = () => {
    for (const pluginName in strapi.plugins) {
      const plugin = strapi.plugins[pluginName];

      const router = new Router({ prefix: `/${pluginName}` });

      for (const route of plugin.routes || []) {
        const hasPrefix = _.has(route.config, 'prefix');
        composeEndpoint(route, {
          pluginName,
          router: hasPrefix ? strapi.router : router,
        });
      }

      strapi.app.use(router.routes()).use(router.allowedMethods());
    }
  };

  const registerAPIRoutes = () => {
    for (const apiName in strapi.api) {
      const api = strapi.api[apiName];

      _.forEach(api.routes, route => {
        // nested router
        if (_.has(route, 'routes')) {
          for (const key in api.routes) {
            const routerInfo = api.routes[key];

            const router = new Router({ prefix: routerInfo.prefix });

            // TODO:: support router routes
            for (const route of routerInfo.routes || []) {
              composeEndpoint(route, { apiName, router });
            }

            strapi.router.use(router.routes()).use(router.allowedMethods());
          }
        } else {
          composeEndpoint(route, { apiName, router: strapi.router });
        }
      });
    }
  };

  return {
    initialize() {
      strapi.router.prefix(strapi.config.get('middleware.settings.router.prefix', ''));
      registerAPIRoutes();
      registerAdminRoutes();
      registerPluginRoutes();
    },
  };
};
