'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const fs = require('fs');
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
      strapi.router.get('/', ctx => {
        ctx.type = 'html';
        ctx.body = fs.createReadStream(path.join(staticDir + '/index.html'));
      });

      // Match every route with an extension.
      // The file without extension will not be served.
      // Note: This route could be override by the user.
      strapi.router.get(
        '/*',
        async (ctx, next) => {
          const parse = path.parse(ctx.url);
          ctx.url = path.join(parse.dir, parse.base);

          await next();
        },
        koaStatic(staticDir, {
          maxage: maxAge,
          defer: true,
        })
      );

      if (!strapi.config.serveAdminPanel) return;

      const basename = _.get(
        strapi.config.currentEnvironment.server,
        'admin.path'
      )
        ? strapi.config.currentEnvironment.server.admin.path
        : '/admin';

      const buildDir = path.resolve(strapi.dir, 'build');

      // Serve admin assets.
      strapi.router.get(
        `${basename}/*`,
        async (ctx, next) => {
          ctx.url = path.basename(ctx.url);
          await next();
        },
        koaStatic(buildDir, {
          index: 'index.html',
          maxage: maxAge,
          defer: false,
        })
      );

      strapi.router.get(`${basename}*`, ctx => {
        ctx.type = 'html';
        ctx.body = fs.createReadStream(path.join(buildDir + '/index.html'));
      });
    },
  };
};
