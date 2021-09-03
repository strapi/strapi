'use strict';

const { toLower, castArray, trim, prop } = require('lodash/fp');

const compose = require('koa-compose');
const { validateRouteConfig } = require('./route');
const { resolveMiddlewares } = require('./middleware');
const { resolvePolicies } = require('./policy');

const getMethod = route => trim(toLower(route.method));
const getPath = route => trim(route.path);
const getHandler = prop('handler');

const createRouteInfoMiddleware = ({ method, path, handler }, { pluginName }) => {
  return (ctx, next) => {
    if (typeof handler === 'string') {
      const [controllerName, actionName] = handler.split('.');
      ctx.request.route = {
        endpoint: `${method} ${path}`,
        controller: toLower(controllerName),
        action: toLower(actionName),
        verb: toLower(method),
        plugin: pluginName,
      };
    }

    return next();
  };
};

const createAuthMiddleware = () => {
  return (ctx, next) => {
    return next();

    // if (routeConfig.auth && routeConfig.auth.public === true) {
    //   return next();
    // }

    // const { credentials, isAuthenticated = false } = ({} = ctx.state.auth);

    // if (!isAuthenticated) {
    //   throw new ctx.unauthorized();
    // }

    // check credentials scope with routeConfig scope
  };
};

module.exports = strapi => {
  return (routeConfig, { pluginName, router, apiName }) => {
    validateRouteConfig(routeConfig);

    try {
      const method = getMethod(routeConfig);
      const path = getPath(routeConfig);
      const handler = getHandler(routeConfig);

      const middlewares = resolveMiddlewares(routeConfig);
      const policies = resolvePolicies(routeConfig, { pluginName, apiName });

      const routeInfoMiddleware = createRouteInfoMiddleware(
        { method, path, handler },
        { pluginName }
      );

      // we can add this as a root middleware
      const authMiddleware = createAuthMiddleware();

      const action = getAction(routeConfig, { pluginName, apiName }, strapi);

      const routeHandler = compose([
        routeInfoMiddleware,
        authMiddleware,
        ...policies,
        ...middlewares,
        ...castArray(action),
      ]);

      router[method](path, routeHandler);
    } catch (error) {
      throw new Error(
        `Error creating endpoint ${routeConfig.method} ${routeConfig.path}: ${error.message}`
      );
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

const getAction = ({ handler }, { pluginName, apiName }, strapi) => {
  if (Array.isArray(handler) || typeof handler === 'function') {
    return handler;
  }

  const [controllerName, actionName] = trim(handler).split('.');

  const controller = getController(toLower(controllerName), { pluginName, apiName }, strapi);

  if (typeof controller[actionName] !== 'function') {
    throw new Error(`Handler not found "${handler}"`);
  }

  return controller[actionName].bind(controller);
};
