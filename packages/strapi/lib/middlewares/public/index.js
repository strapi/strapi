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
      // Match every route with an extension.
      // The file without extension will not be served.
      // Note: This route could be override by the user.
      strapi.router.route({
        method: 'GET',
        path: '/*(.*)?',
        handler: [
          async (ctx, next) => {
            const basename = path.basename(ctx.url);

            ctx.url = basename === '' ? '/' : basename;

            await next();
          },
          strapi.koaMiddlewares.static(strapi.config.middleware.settings.public.path || strapi.config.paths.static, {
            maxage: strapi.config.middleware.settings.public.maxAge,
            defer: true
          })
        ]
      });

      // Plugins.
      _.forEach(strapi.plugins, (value, plugin) => {
        strapi.router.route({
          method: 'GET',
          path: `/plugins/${plugin}/*.*`,
          handler: [
            async (ctx, next) => {
              ctx.url = path.basename(ctx.url);

              await next();
            },
            strapi.koaMiddlewares.static(`./plugins/${plugin}/${strapi.config.middleware.settings.public.path || strapi.config.paths.static}`, {
              maxage: strapi.config.middleware.settings.public.maxAge,
              defer: true
            })
          ]
        });
      });

      cb();
    }
  };
};
