import { toLower, castArray, trim, prop, isNil } from 'lodash/fp';
import type { Core, UID } from '@strapi/types';
import { errors } from '@strapi/utils';
import Router from '@koa/router';

import compose from 'koa-compose';
import { resolveRouteMiddlewares } from './middleware';
import { createPolicicesMiddleware } from './policy';

const getMethod = (route: Core.Route) => {
  return trim(toLower(route.method)) as Lowercase<Core.Route['method']>;
};

const getPath = (route: Core.Route) => trim(route.path);

const createRouteInfoMiddleware =
  (routeInfo: Core.Route): Core.MiddlewareHandler =>
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
  (strapi: Core.Strapi): Core.MiddlewareHandler =>
  async (ctx, next) => {
    const { auth, route } = ctx.state;

    const authService = strapi.get('auth');

    try {
      await authService.verify(auth, getAuthConfig(route));

      return await next();
    } catch (error) {
      if (error instanceof errors.UnauthorizedError) {
        return ctx.unauthorized();
      }

      if (error instanceof errors.ForbiddenError) {
        // allow PolicyError as an exception to throw a publicly visible message in the API
        if (error instanceof errors.PolicyError) {
          throw error;
        }
        return ctx.forbidden();
      }

      throw error;
    }
  };

const createAuthenticateMiddleware =
  (strapi: Core.Strapi): Core.MiddlewareHandler =>
  async (ctx, next) => {
    return strapi.get('auth').authenticate(ctx, next);
  };

const returnBodyMiddleware: Core.MiddlewareHandler = async (ctx, next) => {
  const values = await next();

  if (isNil(ctx.body) && !isNil(values)) {
    ctx.body = values;
  }
};

export default (strapi: Core.Strapi) => {
  const authenticate = createAuthenticateMiddleware(strapi);
  const authorize = createAuthorizeMiddleware(strapi);

  return (route: Core.Route, { router }: { router: Router }) => {
    try {
      const method = getMethod(route);
      const path = getPath(route);

      const middlewares = resolveRouteMiddlewares(route, strapi);

      const action = getAction(route, strapi);

      const routeHandler = compose([
        createRouteInfoMiddleware(route),
        authenticate,
        authorize,
        createPolicicesMiddleware(route, strapi),
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

const getController = (
  name: string,
  { pluginName, apiName }: Core.RouteInfo,
  strapi: Core.Strapi
) => {
  let ctrl: Core.Controller | undefined;

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
    return strapi.controller(name as UID.Controller);
  }

  return ctrl;
};

const extractHandlerParts = (name: string) => {
  const controllerName = name.slice(0, name.lastIndexOf('.'));
  const actionName = name.slice(name.lastIndexOf('.') + 1);

  return { controllerName, actionName };
};

const getAction = (route: Core.Route, strapi: Core.Strapi) => {
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
