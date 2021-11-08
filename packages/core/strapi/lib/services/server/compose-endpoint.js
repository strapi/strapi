'use strict';

const { has, toLower, castArray, trim, prop, isNil } = require('lodash/fp');
const { UnauthorizedError, ForbiddenError } = require('@strapi/utils').errors;

const compose = require('koa-compose');
const { resolveRouteMiddlewares } = require('./middleware');
const { resolvePolicies } = require('./policy');

const getMethod = route => trim(toLower(route.method));
const getPath = route => trim(route.path);

const createRouteInfoMiddleware = routeInfo => (ctx, next) => {
  const route = {
    ...routeInfo,
    config: routeInfo.config || {},
  };

  ctx.state.route = route;
  return next();
};

const getAuthConfig = prop('config.auth');

const createAuthorizeMiddleware = strapi => async (ctx, next) => {
  const { auth, route } = ctx.state;

  const authService = strapi.container.get('auth');

  try {
    await authService.verify(auth, getAuthConfig(route));

    return next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return ctx.unauthorized();
    }

    if (error instanceof ForbiddenError) {
      return ctx.forbidden();
    }

    throw error;
  }
};

const createAuthenticateMiddleware = strapi => async (ctx, next) => {
  return strapi.container.get('auth').authenticate(ctx, next);
};

const returnBodyMiddleware = async (ctx, next) => {
  const values = await next();

  if (isNil(ctx.body) && !isNil(values)) {
    ctx.body = values;
  }
};

module.exports = strapi => {
  const authenticate = createAuthenticateMiddleware(strapi);
  const authorize = createAuthorizeMiddleware(strapi);

  return (route, { router }) => {
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
      error.message = `Error creating endpoint ${route.method} ${route.path}: ${error.message}`;
      throw error;
    }
  };
};

const getController = (name, { pluginName, apiName }, strapi) => {
  if (pluginName) {
    if (pluginName === 'admin') {
      return strapi.controller(`admin::${name}`);
    }

    return strapi.plugin(pluginName).controller(name);
  } else if (apiName) {
    return strapi.controller(`api::${apiName}.${name}`);
  }

  return strapi.controller(name);
};

const getAction = (route, strapi) => {
  const { handler, info = {} } = route;
  const { pluginName, apiName, type } = info;

  if (Array.isArray(handler) || typeof handler === 'function') {
    return handler;
  }

  const [controllerName, actionName] = trim(handler).split('.');

  const controller = getController(controllerName, { pluginName, apiName }, strapi);

  if (typeof controller[actionName] !== 'function') {
    throw new Error(`Handler not found "${handler}"`);
  }

  if (has(Symbol.for('__type__'), controller[actionName])) {
    controller[actionName][Symbol.for('__type__')].push(type);
  } else {
    controller[actionName][Symbol.for('__type__')] = [type];
  }

  return controller[actionName].bind(controller);
};
