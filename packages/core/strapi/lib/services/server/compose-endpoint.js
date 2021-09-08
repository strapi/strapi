'use strict';

const { toLower, castArray, trim } = require('lodash/fp');

const compose = require('koa-compose');
const { resolveMiddlewares } = require('./middleware');
const { resolvePolicies } = require('./policy');

const getMethod = route => trim(toLower(route.method));
const getPath = route => trim(route.path);

const routeInfoMiddleware = route => (ctx, next) => {
  ctx.state.route = route;
  return next();
};

module.exports = strapi => {
  return (route, { pluginName, router, apiName }) => {
    try {
      const method = getMethod(route);
      const path = getPath(route);

      const middlewares = resolveMiddlewares(route);
      const policies = resolvePolicies(route, { pluginName, apiName });

      const action = getAction(route, { pluginName, apiName }, strapi);

      const routeHandler = compose([
        routeInfoMiddleware(route),
        ...policies,
        ...middlewares,
        ...castArray(action),
      ]);

      router[method](path, routeHandler);
    } catch (error) {
      throw new Error(`Error creating endpoint ${route.method} ${route.path}: ${error.message}`);
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
