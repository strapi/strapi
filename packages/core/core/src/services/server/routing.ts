import Router from '@koa/router';
import { has } from 'lodash/fp';
import { yup } from '@strapi/utils';
import type { Core } from '@strapi/types';

import createEndpointComposer from './compose-endpoint';

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
      policies: yup
        .array()
        // FIXME: fixed in yup v1
        .of(policyOrMiddlewareSchema as any)
        .notRequired(),
      middlewares: yup
        .array()
        // FIXME: fixed in yup v1
        .of(policyOrMiddlewareSchema as any)
        .notRequired(),
    })
    .notRequired(),
});

const validateRouteConfig = (routeConfig: Core.RouteInput) => {
  try {
    return routeSchema.validateSync(routeConfig, {
      strict: true,
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      throw new Error(`Invalid route config ${error.message}`);
    }
  }
};

const createRouteManager = (strapi: Core.Strapi, opts: { type?: string } = {}) => {
  const { type } = opts;

  const composeEndpoint = createEndpointComposer(strapi);

  const createRoute = (route: Core.RouteInput, router: Router) => {
    validateRouteConfig(route);

    // NOTE: the router type is used to tag controller actions and for authentication / authorization so we need to pass this info down to the route level
    const routeWithInfo = Object.assign(route, {
      info: {
        ...(route.info ?? {}),
        type: type || 'api',
      },
    });

    composeEndpoint(routeWithInfo, { router });
  };

  const addRoutes = (routes: Core.Router | Core.RouteInput[], router: Router) => {
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

export { validateRouteConfig, createRouteManager };
