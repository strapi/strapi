'use strict';

const _ = require('lodash');

module.exports = strapi => {
  const registerAdminRoutes = () => {
    strapi.admin.routes.forEach(route => {
      route.info = { pluginName: 'admin' };
    });

    strapi.server.routes({
      prefix: '/admin',
      routes: strapi.admin.routes,
    });
  };

  const registerPluginRoutes = () => {
    for (const pluginName in strapi.plugins) {
      const plugin = strapi.plugins[pluginName];

      if (Array.isArray(plugin.routes)) {
        plugin.routes.forEach(route => {
          route.info = { pluginName };
        });

        strapi.server.routes({
          prefix: `/${pluginName}`,
          routes: plugin.routes,
        });
      } else {
        _.forEach(plugin.routes, router => {
          router.prefix = router.prefix || `/${pluginName}`;
          router.routes.forEach(route => {
            route.info = { pluginName };
          });

          strapi.server.routes(router);
        });
      }
    }
  };

  const registerAPIRoutes = () => {
    for (const apiName in strapi.api) {
      const api = strapi.api[apiName];

      _.forEach(api.routes, router => {
        // TODO: remove once auth setup
        // pass meta down to compose endpoint
        router.type = 'content-api';
        router.routes.forEach(route => {
          route.info = { apiName };
        });

        return strapi.server.routes(router);
      });
    }
  };

  return {
    initialize() {
      registerAdminRoutes();
      registerAPIRoutes();
      registerPluginRoutes();
    },
  };
};
