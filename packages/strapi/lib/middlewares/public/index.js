'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

// Public modules
const _ = require('lodash');
const Koa = require('koa');

/**
 * Public assets hook
 */

module.exports = strapi => {
  return {
    /**
     * Default options
     */

    defaults: {
      public: {
        enabled: true,
        maxAge: 60000,
        path: './public'
      }
    },

    /**
     * Initialize the hook
     */

    initialize: function(cb) {
      const isIndexRoute = _.isEmpty(strapi.config.routes)
        ? false
        : strapi.config.routes.find(route => route.path === '/');

      strapi.app.use(
        strapi.koaMiddlewares.static(
          path.resolve(strapi.config.appPath, strapi.config.middleware.settings.public.path || strapi.config.paths.static),
          {
            maxage: strapi.config.middleware.settings.public.maxAge,
            defer: true
          }
        )
      );

      // Mount static to a specific path (pattern: `/plugins/aBc`)
      _.forEach(strapi.plugins, (value, plugin) => {
        // Create koa sub-app
        const app = new Koa();

        app.use(
          strapi.koaMiddlewares.static(
            path.resolve(
              strapi.config.appPath,
              'plugins',
              plugin,
              strapi.config.paths.static
            )
          )
        );

        strapi.app.use(
          strapi.koaMiddlewares.mount(path.join('/plugins', plugin), app)
        );
      });

      cb();
    }
  };
};
