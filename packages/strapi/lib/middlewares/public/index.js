'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');

// Public modules
const _ = require('lodash');
const Koa = require('koa'); // eslint-disable-line no-unused-vars

/**
 * Public assets hook
 */

module.exports = strapi => {
  return {
    /**
     * Initialize the hook
     */

    initialize: function(cb) {
      // Serve /public index page.
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
        path: '/*',
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

      const basename = _.get(strapi.config.currentEnvironment.server, 'admin.path') ?
        strapi.config.currentEnvironment.server.admin.path :
        '/admin';

      // Serve /admin index page.
      strapi.router.route({
        method: 'GET',
        path: basename,
        handler: [
          async (ctx, next) => {
            ctx.url = 'index.html';

            await next();
          },
          strapi.koaMiddlewares.static(`./admin/admin/build`, {
            maxage: strapi.config.middleware.settings.public.maxAge,
            defer: true
          })
        ]
      });

      // Allow refresh in admin page.
      strapi.router.route({
        method: 'GET',
        path: `${basename}/*`,
        handler: [
          async (ctx, next) => {
            const parse = path.parse(ctx.url);

            if (parse.ext === '') {
              ctx.url = 'index.html';
            }

            await next();
          },
          strapi.koaMiddlewares.static(`./admin/admin/build`, {
            maxage: strapi.config.middleware.settings.public.maxAge,
            defer: true
          })
        ]
      });

      // Serve admin assets.
      strapi.router.route({
        method: 'GET',
        path: `${basename}/*.*`,
        handler: [
          async (ctx, next) => {
            ctx.url = path.basename(ctx.url);

            await next();
          },
          strapi.koaMiddlewares.static(`./admin/admin/build`, {
            maxage: strapi.config.middleware.settings.public.maxAge,
            defer: true
          })
        ]
      });

      // Allow page refresh
      strapi.router.route({
        method: 'GET',
        path: `${basename}/plugins/*`,
        handler: [
          async (ctx, next) => {
            const parse = path.parse(ctx.url);

            if (parse.ext === '') {
              ctx.url = 'index.html';
            }

            await next();
          },
          strapi.koaMiddlewares.static(`./admin/admin/build`, {
            maxage: strapi.config.middleware.settings.public.maxAge,
            defer: true
          })
        ]
      });

      // Serve plugins assets.
      strapi.router.route({
        method: 'GET',
        path: `${basename}/:resource/*.*`,
        handler: async (ctx, next) => {
          ctx.url = path.basename(ctx.url);

          if (Object.keys(strapi.plugins).indexOf(ctx.params.resource) !== -1) {
            return await strapi.koaMiddlewares.static(`./plugins/${ctx.params.resource}/admin/build`, {
              maxage: strapi.config.middleware.settings.public.maxAge,
              defer: true
            })(ctx, next);
          }

          // Handle subfolders.
          return await strapi.koaMiddlewares.static(`./admin/admin/build/${ctx.params.resource}`, {
            maxage: strapi.config.middleware.settings.public.maxAge,
            defer: true
          })(ctx, next);
        }
      });

      // Plugins.
      _.forEach(strapi.plugins, (value, plugin) => {
        strapi.router.route({
          method: 'GET',
          path: `/plugins/${plugin}/*.*`,
          handler: [
            async (ctx, next) => {
              ctx.url = path.basename(ctx.url);

              // Try to find assets into the build first.
              return await strapi.koaMiddlewares.static(`./plugins/${plugin}/admin/build`, {
                maxage: strapi.config.middleware.settings.public.maxAge,
                defer: true
              })(ctx, next);
            },
            async (ctx, next) => {
              // Try to find assets in the source then.
              return await strapi.koaMiddlewares.static(`./plugins/${plugin}/${strapi.config.middleware.settings.public.path || strapi.config.paths.static}`, {
                maxage: strapi.config.middleware.settings.public.maxAge,
                defer: true
              })(ctx, next);
            },
          ]
        });

        strapi.router.route({
          method: 'GET',
          path: `${basename}/plugins/${plugin}/*.*`,
          handler: [
            async (ctx, next) => {
              ctx.url = path.basename(ctx.url);

              // Try to find assets into the build first.
              return await strapi.koaMiddlewares.static(`./plugins/${plugin}/admin/build`, {
                maxage: strapi.config.middleware.settings.public.maxAge,
                defer: true
              })(ctx, next);
            },
            async (ctx, next) => {
              // Try to find assets in the source then.
              return await strapi.koaMiddlewares.static(`./plugins/${plugin}/${strapi.config.middleware.settings.public.path || strapi.config.paths.static}`, {
                maxage: strapi.config.middleware.settings.public.maxAge,
                defer: true
              })(ctx, next);
            },
          ]
        });
      });

      cb();
    }
  };
};
