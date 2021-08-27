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
      composeEndpoint(route, { plugin: 'admin', router });
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
          plugin: pluginName,
          router: hasPrefix ? strapi.router : router,
        });
      }

      strapi.app.use(router.routes()).use(router.allowedMethods());
    }
  };

  const registerAPIRoutes = () => {
    strapi.router.prefix(strapi.config.get('middleware.settings.router.prefix', ''));

    for (const route of strapi.config.routes) {
      composeEndpoint(route, { router: strapi.router });
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
