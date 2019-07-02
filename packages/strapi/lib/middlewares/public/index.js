'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const path = require('path');
const _ = require('lodash');
const koaStatic = require('koa-static');

/**
 * Public assets hook
 */

module.exports = strapi => {
  return {
    /**
     * Initialize the hook
     */

    initialize() {
      const { maxAge } = strapi.config.middleware.settings.public;

      const staticDir = path.resolve(
        strapi.dir,
        strapi.config.middleware.settings.public.path ||
          strapi.config.paths.static
      );

      // Serve /public index page.
      strapi.router.route({
        method: 'GET',
        path: '/',
        handler: [
          async (ctx, next) => {
            ctx.url = path.basename(`${ctx.url}/index.html`);

            await next();
          },
          koaStatic(staticDir, {
            maxage: maxAge,
            defer: true,
          }),
        ],
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
          koaStatic(staticDir, {
            maxage: maxAge,
            defer: true,
          }),
        ],
      });

      const basename = _.get(
        strapi.config.currentEnvironment.server,
        'admin.path'
      )
        ? strapi.config.currentEnvironment.server.admin.path
        : '/admin';

      const buildDir = path.resolve(strapi.dir, 'build');

      // Serve /admin index page.
      strapi.router.route({
        method: 'GET',
        path: basename,
        handler: [
          async (ctx, next) => {
            ctx.url = 'index.html';

            await next();
          },
          koaStatic(buildDir, {
            maxage: maxAge,
            defer: true,
          }),
        ],
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
          koaStatic(buildDir, {
            maxage: maxAge,
            defer: true,
          }),
        ],
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
          koaStatic(buildDir, {
            maxage: maxAge,
            defer: true,
          }),
        ],
      });
    },
  };
};
