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

      plugin.routes.forEach(route => {
        route.info = { pluginName };
      });

      strapi.server.routes({
        prefix: `/${pluginName}`,
        routes: plugin.routes,
      });
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
      registerAdminRoutes();
      registerAPIRoutes();
      registerPluginRoutes();
    },
  };
};
