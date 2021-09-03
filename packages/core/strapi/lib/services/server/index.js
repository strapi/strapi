'use strict';

const { has } = require('lodash/fp');
const Koa = require('koa');
const Router = require('@koa/router');

const { createHTTPServer } = require('./http-server');

const createEndpointComposer = require('./compose-endpoint');

const createRouteManager = strapi => {
  const composeEndpoint = createEndpointComposer(strapi);

  const createRoute = (route, router) => {
    composeEndpoint(route, { ...route.info, router });
  };

  const addRoutes = (routes, router) => {
    if (Array.isArray(routes)) {
      routes.forEach(route => createRoute(route, router));
    } else if (routes.routes) {
      const subRouter = new Router({ prefix: routes.prefix });

      routes.routes.forEach(route => {
        const hasPrefix = has('prefix', route.config);
        createRoute(route, hasPrefix ? router : subRouter);
      });

      return router.use(subRouter.routes(), subRouter.allowedMethods());
    }
  };

  return {
    addRoutes,
  };
};

const createAPI = (strapi, opts = {}) => {
  const api = new Router(opts);

  const routeManager = createRouteManager(strapi);

  return {
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
      return this;
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

const createAdminAPI = strapi => {
  return createAPI(strapi, { prefix: '/admin' });
};

const createContentAPI = strapi => {
  const api = createAPI(strapi, { prefix: strapi.config.get('api.prefix', '/api') });

  // Fake protection
  api.use((ctx, next) => {
    console.log('la', ctx.request.query.token);
    if (ctx.request.query.token === 'token') {
      return next();
    }

    ctx.forbidden();
  });

  return api;
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
  const app = new Koa({
    proxy: strapi.config.get('server.proxy'),
  });

  const router = new Router({
    // FIXME: this prefix can break the admin if not specified in the admin url
    prefix: strapi.config.get('middleware.settings.router.prefix', ''),
  });

  const routeManager = createRouteManager(strapi);

  const httpServer = createHTTPServer(strapi, app);

  const apis = {
    admin: createAdminAPI(strapi),
    'content-api': createContentAPI(strapi),
  };

  // init health check
  app.use(healthCheck);

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

      Object.values(apis).forEach(api => api.mount(router));
      app.use(router.routes()).use(router.allowedMethods());

      return this;
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
