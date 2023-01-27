'use strict';

const Router = require('@koa/router');
const _ = require('lodash');
const { has } = require('lodash/fp');
const { yup } = require('@strapi/utils');

const createEndpointComposer = require('./compose-endpoint');

const policyOrMiddlewareSchema = yup.lazy((value) => {
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
  method: yup.string().oneOf(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'ALL']).required(),
  path: yup.string().required(),
  handler: yup.lazy((value) => {
    if (typeof value === 'string') {
      return yup.string().required();
    }

    if (Array.isArray(value)) {
      return yup.array().required();
    }

    return yup.mixed().isFunction().required();
  }),
  config: yup
    .object({
      auth: yup.lazy((value) => {
        if (value === false) {
          return yup.boolean().required();
        }

        return yup.object({
          scope: yup.array().of(yup.string()).required(),
        });
      }),
      policies: yup.array().of(policyOrMiddlewareSchema).notRequired(),
      middlewares: yup.array().of(policyOrMiddlewareSchema).notRequired(),
    })
    .notRequired(),
});

const validateRouteConfig = (routeConfig) => {
  try {
    return routeSchema.validateSync(routeConfig, {
      strict: true,
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (error) {
    throw new Error('Invalid route config', error.message);
  }
};

const createRouteManager = (strapi, opts = {}) => {
  const { type } = opts;

  const composeEndpoint = createEndpointComposer(strapi);

  const createRoute = (route, router) => {
    validateRouteConfig(route);

    // NOTE: the router type is used to tag controller actions and for authentication / authorization so we need to pass this info down to the route level
    _.set(route, 'info.type', type || 'admin');

    composeEndpoint(route, { router });
  };

  const addRoutes = (routes, router) => {
    if (Array.isArray(routes)) {
      routes.forEach((route) => createRoute(route, router));
    } else if (routes.routes) {
      const subRouter = new Router({ prefix: routes.prefix });

      routes.routes.forEach((route) => {
        const hasPrefix = has('prefix', route.config);
        createRoute(route, hasPrefix ? router : subRouter);
      });

      return router.use(subRouter.routes(), subRouter.allowedMethods());
    }
  };

  return {
    addRoutes,
  };
};

module.exports = {
  validateRouteConfig,
  createRouteManager,
};
