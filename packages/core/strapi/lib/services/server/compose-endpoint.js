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
  let ctrl;

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
    return strapi.controller(name);
  }

  return ctrl;
};

const extractHandlerParts = name => {
  const controllerName = name.slice(0, name.lastIndexOf('.'));
  const actionName = name.slice(name.lastIndexOf('.') + 1);

  return { controllerName, actionName };
};

const getAction = (route, strapi) => {
  const { handler, info = {} } = route;
  const { pluginName, apiName, type } = info;

  if (Array.isArray(handler) || typeof handler === 'function') {
    return handler;
  }

  const { controllerName, actionName } = extractHandlerParts(trim(handler));

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
