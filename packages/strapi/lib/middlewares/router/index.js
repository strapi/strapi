'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const Router = require('koa-router');

/**
 * Router hook
 */

module.exports = strapi => {
  const composeEndpoint = require('./utils/composeEndpoint')(strapi);

  return {
    /**
     * Initialize the hook
     */

    initialize() {
      _.forEach(strapi.config.routes, value => {
        composeEndpoint(value, null, strapi.router);
      });

      strapi.router.prefix(
        _.get(strapi.config, 'currentEnvironment.request.router.prefix', '')
      );

      if (!_.isEmpty(_.get(strapi.admin, 'config.routes', false))) {
        // Create router for admin.
        // Prefix router with the admin's name.
        const router = new Router({
          prefix: '/admin',
        });

        _.forEach(strapi.admin.config.routes, value => {
          composeEndpoint(value, null, router);
        });

        // Mount admin router on Strapi router
        strapi.app.use(router.routes()).use(router.allowedMethods());
      }

      if (strapi.plugins) {
        // Parse each plugin's routes.
        _.forEach(strapi.plugins, (plugin, name) => {
          const router = new Router({
            prefix: `/${name}`,
          });

          // Exclude routes with prefix.
          const excludedRoutes = _.omitBy(
            plugin.config.routes,
            o => !_.has(o.config, 'prefix')
          );

          _.forEach(
            _.omit(plugin.config.routes, _.keys(excludedRoutes)),
            value => {
              composeEndpoint(value, name, router);
            }
          );

          // /!\ Could override main router's routes.
          if (!_.isEmpty(excludedRoutes)) {
            _.forEach(excludedRoutes, value => {
              composeEndpoint(value, name, strapi.router);
            });
          }

          // Mount plugin router
          strapi.app.use(router.routes()).use(router.allowedMethods());
        });
      }
    },
  };
};
