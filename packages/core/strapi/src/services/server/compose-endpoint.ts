import { toLower, castArray, trim, prop, isNil } from 'lodash/fp';
import type { Strapi, Common } from '@strapi/types';
import { errors } from '@strapi/utils';
import Router from '@koa/router';

import compose from 'koa-compose';
import { resolveRouteMiddlewares } from './middleware';
import { resolvePolicies } from './policy';

const getMethod = (route: Common.Route) => {
  return trim(toLower(route.method)) as Lowercase<Common.Route['method']>;
};

const getPath = (route: Common.Route) => trim(route.path);

const createRouteInfoMiddleware =
  (routeInfo: Common.Route): Common.MiddlewareHandler =>
  (ctx, next) => {
    const route = {
      ...routeInfo,
      config: routeInfo.config || {},
    };

    ctx.state.route = route;
    return next();
  };

const getAuthConfig = prop('config.auth');

const createAuthorizeMiddleware =
  (strapi: Strapi): Common.MiddlewareHandler =>
  async (ctx, next) => {
    const { auth, route } = ctx.state;

    const authService = strapi.container.get('auth');

    try {
      await authService.verify(auth, getAuthConfig(route));

      return await next();
    } catch (error) {
      if (error instanceof errors.UnauthorizedError) {
        return ctx.unauthorized();
      }

      if (error instanceof errors.ForbiddenError) {
        return ctx.forbidden();
      }

      throw error;
    }
  };

const createAuthenticateMiddleware =
  (strapi: Strapi): Common.MiddlewareHandler =>
  async (ctx, next) => {
    return strapi.container.get('auth').authenticate(ctx, next);
  };

const returnBodyMiddleware: Common.MiddlewareHandler = async (ctx, next) => {
  const values = await next();

  if (isNil(ctx.body) && !isNil(values)) {
    ctx.body = values;
  }
};

export default (strapi: Strapi) => {
  const authenticate = createAuthenticateMiddleware(strapi);
  const authorize = createAuthorizeMiddleware(strapi);

  return (route: Common.Route, { router }: { router: Router }) => {
    try {
      const method = getMethod(route);
      const path = getPath(route);

      const middlewares = resolveRouteMiddlewares(route, strapi);
      const policies = resolvePolicies(route);

      const action = getAction(route, strapi);

      const routeHandler = compose([
        createRouteInfoMiddleware(route),
        authenticate,
        authorize,
        ...policies,
        ...middlewares,
        returnBodyMiddleware,
        ...castArray(action),
      ]);

      router[method](path, routeHandler);
    } catch (error) {
      if (error instanceof Error) {
        error.message = `Error creating endpoint ${route.method} ${route.path}: ${error.message}`;
      }

      throw error;
    }
  };
};

const getController = (name: string, { pluginName, apiName }: Common.RouteInfo, strapi: Strapi) => {
  let ctrl: Common.Controller | undefined;

  if (pluginName) {
    if (pluginName === 'admin') {
      ctrl = strapi.controller(`admin::${name}`);
    } else {
      ctrl = strapi.plugin(pluginName).controller(name);
    }
  } else if (apiName) {
    ctrl = strapi.controller(`api::${apiName}.${name}`);
  }

  if (!ctrl) {
    return strapi.controller(name as Common.UID.Controller);
  }

  return ctrl;
};

const extractHandlerParts = (name: string) => {
  const controllerName = name.slice(0, name.lastIndexOf('.'));
  const actionName = name.slice(name.lastIndexOf('.') + 1);

  return { controllerName, actionName };
};

const getAction = (route: Common.Route, strapi: Strapi) => {
  const { handler, info } = route;
  const { pluginName, apiName, type } = info ?? {};

  if (Array.isArray(handler) || typeof handler === 'function') {
    return handler;
  }

  const { controllerName, actionName } = extractHandlerParts(trim(handler));

  const controller = getController(controllerName, { pluginName, apiName, type }, strapi);

  if (typeof controller[actionName] !== 'function') {
    throw new Error(`Handler not found "${handler}"`);
  }

  if (Symbol.for('__type__') in controller[actionName]) {
    (controller[actionName] as any)[Symbol.for('__type__')].push(type);
  } else {
    (controller[actionName] as any)[Symbol.for('__type__')] = [type];
  }

  return controller[actionName].bind(controller);
};
