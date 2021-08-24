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

  const registerAdminRoutes = strapi => {
    const router = new Router({ prefix: '/admin' });

    strapi.admin.routes.forEach(route => {
      composeEndpoint(route, { plugin: 'admin', router });
    });

    strapi.app.use(router.routes()).use(router.allowedMethods());
  };

  return {
    initialize() {
      _.forEach(strapi.config.routes, value => {
        composeEndpoint(value, { router: strapi.router });
      });

      strapi.router.prefix(strapi.config.get('middleware.settings.router.prefix', ''));

      registerAdminRoutes(strapi);

      if (strapi.plugins) {
        // Parse each plugin's routes.
        _.forEach(strapi.plugins, (plugin, pluginName) => {
          const router = new Router({ prefix: `/${pluginName}` });

          (plugin.routes || []).forEach(route => {
            const hasPrefix = _.has(route.config, 'prefix');
            composeEndpoint(route, {
              plugin: pluginName,
              router: hasPrefix ? strapi.router : router,
            });
          });

          // Mount plugin router
          strapi.app.use(router.routes()).use(router.allowedMethods());
        });
      }
    },
  };
};
