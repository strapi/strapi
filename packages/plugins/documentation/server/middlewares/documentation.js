'use strict';

const path = require('path');
const _ = require('lodash');
const koaStatic = require('koa-static');

const initialRoutes = [];

// TODO: delete when refactoring documentation plugin for v4
module.exports = async ({ strapi }) => {
  // strapi.config.middleware.load.before.push('documentation');

  initialRoutes.push(..._.cloneDeep(strapi.plugins.documentation.routes));

  const swaggerUi = require('swagger-ui-dist');

  // Find the plugins routes.
  strapi.plugins.documentation.routes = strapi.plugins.documentation.routes.map((route, index) => {
    if (route.handler === 'Documentation.getInfos') {
      return route;
    }

    if (route.handler === 'Documentation.index' || route.path === '/login') {
      route.config.policies = initialRoutes[index].config.policies;
    }

    // Set prefix to empty to be able to customise it.
    if (strapi.config.has('plugins.documentation.x-strapi-config.path')) {
      route.config.prefix = '';
      route.path = `/${strapi.config.get('plugin.documentation.x-strapi-config').path}${
        route.path
      }`.replace('//', '/');
    }

    return route;
  });

  strapi.server.routes([
    {
      method: 'GET',
      path: '/plugins/documentation/(.*)',
      async handler(ctx, next) {
        ctx.url = path.basename(ctx.url);

        return koaStatic(swaggerUi.getAbsoluteFSPath(), {
          maxage: 6000,
          defer: true,
        })(ctx, next);
      },
      config: {
        auth: false,
      },
    },
  ]);
};
