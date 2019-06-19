'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const routerJoi = require('koa-router-joi');

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
        const router = routerJoi();

        _.forEach(strapi.admin.config.routes, value => {
          composeEndpoint(value, null, router);
        });

        // router.prefix(strapi.config.admin.path || `/${strapi.config.paths.admin}`);
        router.prefix('/admin');

        // TODO:
        // - Mount on main router `strapi.router.use(routerAdmin.middleware());`

        // Mount admin router on Strapi router
        strapi.app.use(router.middleware());
      }

      if (strapi.plugins) {
        // Parse each plugin's routes.
        _.forEach(strapi.plugins, (plugin, name) => {
          const router = routerJoi();

          // Exclude routes with prefix.
          const excludedRoutes = _.omitBy(
            plugin.config.routes,
            o => !o.config.hasOwnProperty('prefix')
          );

          _.forEach(
            _.omit(plugin.config.routes, _.keys(excludedRoutes)),
            value => {
              composeEndpoint(value, name, router);
            }
          );

          router.prefix(`/${name}`);

          // /!\ Could override main router's routes.
          if (!_.isEmpty(excludedRoutes)) {
            _.forEach(excludedRoutes, value => {
              composeEndpoint(value, name, strapi.router);
            });
          }

          // TODO:
          // - Mount on main router `strapi.router.use(router.middleware());`

          // Mount plugin router
          strapi.app.use(router.middleware());
        });
      }

      // Let the router use our routes and allowed methods.
      strapi.app.use(strapi.router.middleware());
    },
  };
};
