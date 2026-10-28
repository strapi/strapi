import { castArray, property, toLower, trim } from 'lodash';
import type { Core, UID } from '@strapi/types';
import { errors } from '@strapi/utils';
import Router from '@koa/router';

import compose from 'koa-compose';
import { resolveRouteMiddlewares } from './middleware';
import { createPolicicesMiddleware } from './policy';
import {
  RoutePathMigrationError,
  type RoutePathConstraint,
  translateRoutePath,
} from './route-path';

const getMethod = (route: Core.Route) => {
  return trim(toLower(route.method)) as Lowercase<Core.Route['method']>;
};

const getPath = (route: Core.Route, strapi: Core.Strapi) => {
  if (typeof route.path !== 'string') {
    return { path: route.path, constraints: [] };
  }

  const path = trim(route.path);
  const translated = translateRoutePath(path);

  if (translated.changed) {
    strapi.log.warn(
      `Route "${route.method} ${path}" uses path-to-regexp v6 syntax and was migrated to "${translated.path}".`
    );
  }

  return translated;
};

const createRoutePathConstraintMiddleware =
  (constraints: RoutePathConstraint[]): Core.MiddlewareHandler =>
  async (ctx, next) => {
    if (constraints.some(({ name, pattern }) => !pattern.test(ctx.params[name]))) {
      return ctx.notFound();
    }

    return next();
  };

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

const getAuthConfig = property('config.auth');

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

  if (ctx.body == null && values != null) {
    ctx.body = values;
  }
};

export default (strapi: Core.Strapi) => {
  const authenticate = createAuthenticateMiddleware(strapi);
  const authorize = createAuthorizeMiddleware(strapi);

  return (route: Core.Route, { router }: { router: Router }) => {
    try {
      const method = getMethod(route);
      const { path, constraints } = getPath(route, strapi);

      const middlewares = resolveRouteMiddlewares(route, strapi);

      const action = getAction(route, strapi);

      const routeHandler = compose([
        createRouteInfoMiddleware(route),
        createRoutePathConstraintMiddleware(constraints),
        authenticate,
        authorize,
        createPolicicesMiddleware(route, strapi),
        ...middlewares,
        returnBodyMiddleware,
        ...castArray(action),
      ]);

      try {
        router[method](path, routeHandler);
      } catch (error) {
        if (typeof route.path === 'string' && error instanceof Error) {
          throw new RoutePathMigrationError(
            route.path,
            `path-to-regexp v8 rejected the translated path "${path}": ${error.message}`
          );
        }

        throw error;
      }
    } catch (error) {
      if (error instanceof RoutePathMigrationError) {
        throw error;
      }

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
