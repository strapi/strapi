'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const path = require('path');

// Variables.
const initialRoutes = [];

module.exports = strapi => {

  return {
    beforeInitialize: function() {
      strapi.config.middleware.load.before.push('documentation');

      initialRoutes.push(..._.cloneDeep(strapi.plugins.documentation.config.routes));
    },
    
    initialize: function(cb) {
      // Find the plugins routes.
      strapi.plugins.documentation.config.routes = strapi.plugins.documentation.config.routes
        .map((route, index) => {
          if (route.handler === 'Documentation.getInfos') {
            return route;
          }

          if (route.handler === 'Documentation.index' || route.path === '/login') {
            route.config.policies = initialRoutes[index].config.policies;
          }
          
          // Set prefix to empty to be able to customise it.
          if (_.get(strapi.plugins, ['documentation', 'config', 'x-strapi-config', 'path'])) {
            route.config.prefix = '';
            route.path = `/${strapi.plugins.documentation.config['x-strapi-config'].path}${route.path}`.replace('//', '/');
          }

          return route;
        });

      strapi.router.route({
        method: 'GET',
        path: '/plugins/documentation/*.*',
        handler: [
          async (ctx, next) => {
            ctx.url = path.basename(ctx.url);

            return await strapi.koaMiddlewares.static(`./plugins/documentation/node_modules/swagger-ui-dist`, {
              maxage: strapi.config.middleware.settings.public.maxAge,
              defer: true
            })(ctx, next);
          }
        ]
      });

      cb();
    }
  };
};