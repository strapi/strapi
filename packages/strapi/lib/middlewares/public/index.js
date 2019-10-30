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
        strapi.config.middleware.settings.public.path ||
          strapi.config.paths.static
      );

      // Open the file.
      const filename =
        strapi.config.environment === 'development' ? 'index' : 'production';
      const index = fs.readFileSync(
        path.join(staticDir, `${filename}.html`),
        'utf8'
      );

      // Is the project initialized?
      const isInitialised = await utils.isInitialised(strapi);

      // Template the expressions.
      const templatedIndex = await this.template(index, isInitialised);

      const serveDynamicFiles = async ctx => {
        ctx.url = path.basename(`${ctx.url}/${filename}.html`);

        // Open stream to serve the file.
        const filestream = new stream.PassThrough();
        filestream.end(Buffer.from(templatedIndex));

        // Serve static.
        ctx.type = 'html';
        ctx.body = filestream;
      };

      // Serve /public index page.
      strapi.router.get('/', serveDynamicFiles);
      strapi.router.get('/(index.html|production.html)', serveDynamicFiles);

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

    template: async (data, isInitialised) => {
      // Allowed expressions to avoid data leaking.
      const allowedExpression = [
        'config.info.version',
        'config.info.name',
        'config.admin.url',
        'config.environment',
        'serverTime',
        'isInitialised',
      ];

      // Populate values to object.
      const objectWithValues = allowedExpression.reduce((acc, key) => {
        switch (key) {
          case 'serverTime':
            acc[key] = new Date().toUTCString();

            break;
          case 'isInitialised':
            acc[key] = isInitialised;

            break;
          default: {
            acc[key] = _.get(strapi, key, '');
          }
        }

        return acc;
      }, {});

      const templatedIndex = _.template(data);

      return templatedIndex(objectWithValues);
    },
  };
};
