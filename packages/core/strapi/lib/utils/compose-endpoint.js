'use strict';

const _ = require('lodash');
const compose = require('koa-compose');
const { yup, policy: policyUtils } = require('@strapi/utils');

const { bodyPolicy } = policyUtils;

const policyOrMiddlewareSchema = yup.lazy(value => {
  if (typeof value === 'string') {
    return yup.string().required();
  }

  if (typeof value === 'function') {
    return yup.mixed().isFunction();
  }

  return yup.object({
    name: yup.string().required(),
    options: yup.object().notRequired(), // any options
  });
});

const routeSchema = yup.object({
  method: yup
    .string()
    .oneOf(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'ALL'])
    .required(),
  path: yup.string().required(),
  handler: yup.lazy(value => {
    if (typeof value === 'string') {
      return yup.string().required();
    }

    if (Array.isArray(value)) {
      return yup.array().required();
    }

    return yup
      .mixed()
      .isFunction()
      .required();
  }),
  config: yup
    .object({
      policies: yup
        .array()
        .of(policyOrMiddlewareSchema)
        .notRequired(),
      middlwares: yup
        .array()
        .of(policyOrMiddlewareSchema)
        .notRequired(),
    })
    .notRequired(),
});

const validateRouteConfig = routeConfig => {
  try {
    return routeSchema.validateSync(routeConfig, {
      strict: true,
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (error) {
    console.error(error);
    throw new Error('Invalid route config');
  }
};

module.exports = strapi => {
  const routerChecker = createRouteChecker(strapi);

  return (routeConfig, { pluginName, router, apiName }) => {
    validateRouteConfig(routeConfig);

    try {
      const middlewares = resolveMiddlewares(routeConfig);

      const { method, endpoint, policies, action } = routerChecker(routeConfig, {
        pluginName,
        apiName,
      });

      if (_.isUndefined(action)) {
        return strapi.log.warn(
          `Ignored attempt to bind route '${routeConfig.method} ${routeConfig.path}' to unknown controller/action.`
        );
      }

      router[method](endpoint, compose([...policies, ...middlewares, ..._.castArray(action)]));
    } catch (error) {
      throw new Error(
        `Error creating endpoint ${routeConfig.method} ${routeConfig.path}: ${error.message}`
      );
    }
  };
};

const resolveMiddlewares = route => {
  const middlewaresConfig = _.get(route, 'config.middlewares', []);

  return middlewaresConfig.map(middlewareConfig => {
    if (typeof middlewareConfig === 'function') {
      return middlewareConfig;
    }

    const middleware = strapi.middleware(middlewareConfig);

    if (!middleware) {
      throw new Error(`Middleware ${middlewareConfig} not found.`);
    }

    return middleware;
  });
};

const getMethod = route => _.trim(_.toLower(route.method));
const getEndpoint = route => _.trim(route.path);

const getAction = ({ method, endpoint, handler }, { pluginName, apiName }, strapi) => {
  // Define controller and action names.
  const [controllerName, actionName] = _.trim(handler).split('.');
  const controllerKey = _.toLower(controllerName);

  let controller;

  if (pluginName) {
    if (pluginName === 'admin') {
      controller = strapi.admin.controllers[controllerKey];
    } else {
      controller = strapi.plugin(pluginName).controller(controllerKey);
    }
  } else {
    controller = strapi.container.get('controllers').get(`api::${apiName}.${controllerKey}`);
  }
  if (!_.isFunction(controller[actionName])) {
    strapi.stopWithError(
      `Error creating endpoint ${method} ${endpoint}: handler not found "${controllerKey}.${actionName}"`
    );
  }

  return {
    action: controller[actionName].bind(controller),
    actionName,
    controllerKey,
  };
};

const createRouteChecker = strapi => {
  return (value, { pluginName, apiName }) => {
    const { handler } = value;
    const method = getMethod(value);
    const endpoint = getEndpoint(value);
    const policies = [];
    let action;

    if (Array.isArray(handler) || typeof handler === 'function') {
      action = handler;
    } else {
      const actionInfo = getAction({ method, endpoint, handler }, { pluginName, apiName }, strapi);
      action = actionInfo.action;

      const globalPolicy = policyUtils.globalPolicy({
        controller: actionInfo.controllerKey,
        action: actionInfo.actionName,
        method,
        endpoint,
        plugin: pluginName,
      });

      policies.push(globalPolicy);
    }

    const policyOption = _.get(value, 'config.policies', []);

    const routePolicies = policyOption.map(policyConfig =>
      policyUtils.get(policyConfig, { pluginName, apiName })
    );

    // Init policies array.
    policies.push(...routePolicies, bodyPolicy);

    return {
      method,
      endpoint,
      policies,
      action,
    };
  };
};
