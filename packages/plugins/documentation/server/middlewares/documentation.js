'use strict';

const path = require('path');
const koaStatic = require('koa-static');
const session = require('koa-session');
const swaggerUi = require('swagger-ui-dist');

module.exports = async ({ strapi }) => {
  const sessionConfig = strapi.config.get('plugin.documentation').session;
  strapi.server.app.keys = sessionConfig.secretKeys;
  strapi.server.app.use(session(sessionConfig, strapi.server.app));

  strapi.server.routes([
    {
      method: 'GET',
      path: '/plugins/documentation/(.*)',
      async handler(ctx, next) {
        ctx.url = path.basename(ctx.url);

        return koaStatic(swaggerUi.getAbsoluteFSPath(), {
          maxage: 86400000,
          defer: true,
        })(ctx, next);
      },
      config: {
        auth: false,
      },
    },
  ]);
};
