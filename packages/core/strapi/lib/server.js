'use strict';

const Koa = require('koa');
const Router = require('@koa/router');

const { createHTTPServer } = require('./http-server');

const createEndpointComposer = require('./middlewares/router/utils/compose-endpoint');

const createRouteManager = strapi => {
  const composeEndpoint = createEndpointComposer(strapi);

  const createRoute = (route, router) => {
    composeEndpoint(route, { ...route.info, router });
  };

  const addRoutes = (routes, router) => {
    if (Array.isArray(routes)) {
      routes.forEach(route => createRoute(route, router));
    }

    if (routes.routes) {
      const subRouter = new Router({ prefix: routes.prefix });

      routes.routes.forEach(route => createRoute(route, subRouter));

      return router.use(subRouter.routes(), subRouter.allowedMethods());
    }
  };

  return {
    addRoutes,
  };
};

const createAPI = (prefix, strapi) => {
  const api = new Router({ prefix: `/${prefix}` });

  const routeManager = createRouteManager(strapi);

  return {
    prefix,

    use(fn) {
      api.use(fn);
      return this;
    },

    routes(routes) {
      routeManager.addRoutes(routes, api);
      return this;
    },

    mount(router) {
      router.use(api.routes(), api.allowedMethods());
    },
  };
};

const healthCheck = async (ctx, next) => {
  if (ctx.request.url === '/_health' && ['HEAD', 'GET'].includes(ctx.request.method)) {
    ctx.set('strapi', 'You are so French!');
    ctx.status = 204;
  } else {
    await next();
  }
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
const createServer = strapi => {
  // TODO: set root level prefix
  // strapi.router.prefix(strapi.config.get('middleware.settings.router.prefix', ''));

  const app = new Koa();
  const router = new Router();

  app.proxy = strapi.config.get('server.proxy');

  const routeManager = createRouteManager(strapi);

  const httpServer = createHTTPServer(strapi, app);

  const apis = {
    admin: createAPI('admin', strapi),
    'content-api': createAPI('api', strapi),
  };

  // init health check
  app.use(healthCheck);

  return {
    app,
    httpServer,

    api(name) {
      return apis[name];
    },

    /**
     * Add a middleware to the main koa app or an api
     * @param {string|function} path
     * @param {function} fn
     * @returns {Server}
     */
    use(path, fn) {
      if (typeof path === 'function') {
        app.use(path);
        return this;
      }

      if (typeof path === 'string') {
        apis[path].use(fn);
        return this;
      }

      throw new Error('Use expects to be called with (fn) or (name, callback)');
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

    listen(...args) {
      app.use(router.routes()).use(router.allowedMethods());

      Object.values(apis).forEach(api => api.mount(router));

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
