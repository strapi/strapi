'use strict';

/**
 * Module dependencies
 */

// Node.js core.
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const koaStatic = require('koa-static');
const stream = require('stream');

const utils = require('../../utils');

/**
 * Public assets hook
 */

module.exports = strapi => {
  return {
    /**
     * Initialize the hook
     */

    async initialize() {
      const { maxAge } = strapi.config.middleware.settings.public;
      const staticDir = path.resolve(
        strapi.dir,
        strapi.config.middleware.settings.public.path || strapi.config.paths.static
      );
      const indexFileName = 'index.html';
      const indexPath = path.join(staticDir, indexFileName);

      if (fs.existsSync(indexPath)) {
        const index = fs.readFileSync(indexPath, 'utf8');
        const renderer = _.template(index); // Is the project initialized?

        const renderIndexPage = async () => {
          const isInitialised = await utils.isInitialised(strapi);

          const data = {
            serverTime: new Date().toUTCString(),
            isInitialised,
            ..._.pick(strapi, [
              'config.info.version',
              'config.info.name',
              'config.admin.url',
              'config.environment',
            ]),
          };

          return renderer(data);
        };

        const serveIndexPage = async ctx => {
          ctx.url = indexFileName;

          const content = await renderIndexPage();
          const body = stream.Readable({
            read() {
              this.push(Buffer.from(content));
              this.push(null);
            },
          });
          // Serve static.
          ctx.type = 'html';
          ctx.body = body;
        };

        // Serve /public index page.
        strapi.router.get('/', serveIndexPage);
        strapi.router.get(`/${indexFileName}`, serveIndexPage);
      }

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

      const basename = _.get(strapi.config.currentEnvironment.server, 'admin.path')
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
          index: indexFileName,
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
