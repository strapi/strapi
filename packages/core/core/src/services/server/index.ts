import Router from '@koa/router';
import type { Core, Modules } from '@strapi/types';

import { isBoolean } from 'lodash/fp';
import { createHTTPServer } from './http-server';
import { createRouteManager } from './routing';
import { createAdminAPI } from './admin-api';
import { createContentAPI } from './content-api';
import registerAllRoutes from './register-routes';
import registerApplicationMiddlewares from './register-middlewares';
import createKoaApp from './koa';
import requestCtx from '../request-context';

const healthCheck: Core.MiddlewareHandler = async (ctx) => {
  ctx.set('strapi', 'You are so French!');
  ctx.status = 204;
};

const shouldTrustProxy = (strapi: Core.Strapi) => {
  const explicit = strapi.config.get('server.proxy.koa', undefined);

  if (isBoolean(explicit)) {
    return explicit;
  }

  const implicit =
    !!strapi.config.get('server.proxy.global') ||
    strapi.config.get('server.proxy.http') ||
    strapi.config.get('server.proxy.https') ||
    false;

  return implicit;
};

const createServer = (strapi: Core.Strapi): Modules.Server.Server => {
  const app = createKoaApp({
    proxy: shouldTrustProxy(strapi),
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

    routes(routes: Core.Router | Omit<Core.Route, 'info'>[]) {
      if (!Array.isArray(routes) && routes.type) {
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
      return [...router.stack];
    },

    listen(...args: any[]) {
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

export { createServer };
