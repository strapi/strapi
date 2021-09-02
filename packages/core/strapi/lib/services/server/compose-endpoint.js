'use strict';

const { toLower, castArray, trim } = require('lodash/fp');

const compose = require('koa-compose');
const { validateRouteConfig } = require('./route');
const { resolveMiddlewares } = require('./middleware');
const { resolvePolicies } = require('./policy');

const getMethod = route => trim(toLower(route.method));
const getPath = route => trim(route.path);

module.exports = strapi => {
  return (routeConfig, { pluginName, router, apiName }) => {
    validateRouteConfig(routeConfig);

    try {
      const method = getMethod(routeConfig);
      const path = getPath(routeConfig);

      const middlewares = resolveMiddlewares(routeConfig);
      const policies = resolvePolicies(routeConfig, { pluginName, apiName });

      const routeInfo = (ctx, next) => {
        if (typeof routeConfig.handler === 'string') {
          const [controllerName, actionName] = routeConfig.handler.split('.');
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

      const auth = (ctx, next) => {
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

      const action = getAction(routeConfig, { pluginName, apiName }, strapi);
      const handler = compose([routeInfo, auth, ...policies, ...middlewares, ...castArray(action)]);

      router[method](path, handler);
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
