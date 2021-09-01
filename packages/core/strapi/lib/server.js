'use strict';

const Koa = require('koa');
const Router = require('@koa/router');
const mount = require('koa-mount');

const { createHTTPServer } = require('./http-server');

const createRoute = (route, router) => {
  router[route.method.toLowerCase()](route.path, route.handler);
};

// TODO: connect to compose Endpoint
const addRoutes = (routes, app) => {
  if (Array.isArray(routes)) {
    const router = new Router();

    routes.forEach(route => createRoute(route, router));

    return app.use(router.routes()).use(router.allowedMethods());
  }

  if (routes.routes) {
    const router = new Router({ prefix: routes.prefix });

    routes.routes.forEach(route => createRoute(route, router));

    app.use(router.routes()).use(router.allowedMethods());
  }
};

const createAPI = prefix => {
  const app = new Koa();

  return {
    prefix,

    use(fn) {
      app.use(fn);
      return this;
    },

    routes(routes) {
      addRoutes(routes, app);
      return this;
    },

    get middleware() {
      return app;
    },
  };
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
  const app = new Koa();
  const httpServer = createHTTPServer(strapi, this.app);
  const apis = {
    admin: createAPI('admin'),
    'content-api': createAPI('api'),
  };

  return {
    app,
    httpServer,

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

      addRoutes(routes, app);
      return this;
    },

    start(args) {
      Object.values(apis).forEach(api => {
        app.use(mount(`/${api.prefix}`, api.app));
      });

      return httpServer.listen(...args);
    },

    async destroy() {
      await this.httpServer.destroy();
    },
  };
};

module.exports = {
  createServer,
};
