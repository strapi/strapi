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

    strapi.admin.routes.forEach(route => {
      composeEndpoint(route, { plugin: 'admin', router });
    });

    strapi.app.use(router.routes()).use(router.allowedMethods());
  };

  const registerPluginRoutes = () => {
    _.forEach(strapi.plugins, (plugin, pluginName) => {
      const router = new Router({ prefix: `/${pluginName}` });

      (plugin.routes || []).forEach(route => {
        const hasPrefix = _.has(route.config, 'prefix');
        composeEndpoint(route, {
          plugin: pluginName,
          router: hasPrefix ? strapi.router : router,
        });
      });

      strapi.app.use(router.routes()).use(router.allowedMethods());
    });
  };

  const registerAPIRoutes = () => {
    strapi.router.prefix(strapi.config.get('middleware.settings.router.prefix', ''));

    _.forEach(strapi.config.routes, value => {
      composeEndpoint(value, { router: strapi.router });
    });
  };

  return {
    initialize() {
      registerAPIRoutes();
      registerAdminRoutes();
      registerPluginRoutes();
    },
  };
};
