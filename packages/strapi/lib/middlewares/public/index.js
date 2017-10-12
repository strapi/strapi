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
      // Default index pages.
      strapi.router.route({
        method: 'GET',
        path: '/',
        handler: [
          async (ctx, next) => {
            ctx.url = path.basename(`${ctx.url}/index.html`);

            await next();
          },
          strapi.koaMiddlewares.static(strapi.config.middleware.settings.public.path || strapi.config.paths.static, {
            maxage: strapi.config.middleware.settings.public.maxAge,
            defer: true
          })
        ]
      });

      // Match every route with an extension.
      // The file without extension will not be served.
      // Note: This route could be override by the user.
      strapi.router.route({
        method: 'GET',
        path: '/*.*',
        handler: [
          async (ctx, next) => {
            const parse = path.parse(ctx.url);

            ctx.url = path.join(parse.dir, parse.base);

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

        strapi.router.route({
          method: 'GET',
          path: `/${plugin}/assets/*.*`,
          handler: [
            async (ctx, next) => {
              ctx.url = path.basename(ctx.url);

              await next();
            },
            strapi.koaMiddlewares.static(`./plugins/${plugin}/admin/build`, {
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
