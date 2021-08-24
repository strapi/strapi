'use strict';

const _ = require('lodash');
const compose = require('koa-compose');
const { yup } = require('@strapi/utils');

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

// Strapi utilities.
const { finder, policy: policyUtils } = require('@strapi/utils');

module.exports = strapi => {
  const routerChecker = createRouteChecker(strapi);

  return (routeConfig, { plugin, router }) => {
    validateRouteConfig(routeConfig);

    // const { method, path, handler, config } = routeConfig;
    // const { policies, middlewares /* validate, auth, ...rest */ } = config;

    // const requestMethod = _.trim(_.toLower(method));
    // const endpoint = _.trim(path);

    // const requestHandler = compose([
    //   // ...buildValidator(validate),
    //   // ...buildAuth(auth),
    //   ...resolvePolicies(policies),
    //   ...resolveMiddlewares(middlewares),
    //   ...resolveHandler(handler),
    // ]);

    // router[requestMethod](endpoint, requestHandler);

    try {
      const middlewares = resolveMiddlewares(routeConfig);

      const { method, endpoint, policies, action } = routerChecker(routeConfig, plugin);

      if (_.isUndefined(action) || !_.isFunction(action)) {
        return strapi.log.warn(
          `Ignored attempt to bind route '${routeConfig.method} ${routeConfig.path}' to unknown controller/action.`
        );
      }

      router[method](endpoint, compose([...policies, ...middlewares, action]));
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

const createRouteChecker = strapi => {
  return (value, plugin) => {
    const method = getMethod(value);
    const endpoint = getEndpoint(value);

    // Define controller and action names.
    const [controllerName, actionName] = _.trim(value.handler).split('.');
    const controllerKey = _.toLower(controllerName);

    let controller;

    if (plugin) {
      if (plugin === 'admin') {
        controller = strapi.admin.controllers[controllerKey];
      } else {
        controller = strapi.plugin(plugin).controller(controllerKey);
      }
    } else {
      controller = strapi.controllers[controllerKey];
    }

    if (!_.isFunction(controller[actionName])) {
      strapi.stopWithError(
        `Error creating endpoint ${method} ${endpoint}: handler not found "${controllerKey}.${actionName}"`
      );
    }

    const action = controller[actionName].bind(controller);

    // Retrieve the API's name where the controller is located
    // to access to the right validators
    const currentApiName = finder(
      strapi.plugin(plugin) || strapi.api || strapi.admin,
      controllerKey
    );

    const { bodyPolicy } = policyUtils;

    const globalPolicy = policyUtils.globalPolicy({
      controller: controllerKey,
      action: actionName,
      method,
      endpoint,
      plugin,
    });

    const policyOption = _.get(value, 'config.policies', []);

    const routePolicies = policyOption.map(policyConfig => {
      return policyUtils.get(policyConfig, plugin, currentApiName);
    });

    // Init policies array.
    const policies = [globalPolicy, ...routePolicies, bodyPolicy];

    return {
      method,
      endpoint,
      policies,
      action,
    };
  };
};
