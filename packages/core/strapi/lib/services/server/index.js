'use strict';

const Router = require('@koa/router');

const { createHTTPServer } = require('./http-server');
const { createRouteManager } = require('./routing');
const { createAdminAPI } = require('./admin-api');
const { createContentAPI } = require('./content-api');
const registerAllRoutes = require('./register-routes');
const registerApplicationMiddlewares = require('./register-middlewares');
const createKoaApp = require('./koa');
const requestCtx = require('../request-context');

const healthCheck = async (ctx) => {
  ctx.set('strapi', 'You are so French!');
  ctx.status = 204;
};

/**
 * @typedef Server
 *
 * @property {Koa} app
 * @property {http.Server} app
 */

/**
 *
 * @param {Strapi} strapi
 * @returns {Server}
 */
const createServer = (strapi) => {
  const app = createKoaApp({
    proxy: strapi.config.get('server.proxy'),
    keys: strapi.config.get('server.app.keys'),
  });

  app.use((ctx, next) => requestCtx.run(ctx, () => next()));

  const router = new Router();

  const routeManager = createRouteManager(strapi);

  const httpServer = createHTTPServer(strapi, app);

  const apis = {
    'content-api': createContentAPI(strapi),
    admin: createAdminAPI(strapi),
  };

  // init health check
  router.all('/_health', healthCheck);

  const state = {
    mounted: false,
  };

  return {
    app,
    router,
    httpServer,

    api(name) {
      return apis[name];
    },

    use(...args) {
      app.use(...args);
      return this;
    },

    routes(routes) {
      if (routes.type) {
        const api = apis[routes.type];
        if (!api) {
          throw new Error(`API ${routes.type} not found. Possible APIs are ${Object.keys(apis)}`);
        }

        apis[routes.type].routes(routes);
        return this;
      }

      routeManager.addRoutes(routes, router);
      return this;
    },

    mount() {
      state.mounted = true;

      Object.values(apis).forEach((api) => api.mount(router));
      app.use(router.routes()).use(router.allowedMethods());

      return this;
    },

    initRouting() {
      registerAllRoutes(strapi);

      return this;
    },

    async initMiddlewares() {
      await registerApplicationMiddlewares(strapi);

      return this;
    },

    listRoutes() {
      const allRoutes = [...router.stack];

      Object.values(apis).forEach((api) => {
        allRoutes.push(...api.listRoutes());
      });

      return allRoutes;
    },

    listen(...args) {
      if (!state.mounted) {
        this.mount();
      }

      return httpServer.listen(...args);
    },

    async destroy() {
      await httpServer.destroy();
    },
  };
};

module.exports = {
  createServer,
};
