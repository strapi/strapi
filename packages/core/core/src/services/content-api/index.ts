import { sanitize, validate } from '@strapi/utils';

import type { Core, UID } from '@strapi/types';

import instantiatePermissionsUtilities from './permissions';

const transformRoutePrefixFor = (pluginName: string) => (route: Core.Route) => {
  const prefix = route.config && route.config.prefix;
  const path = prefix !== undefined ? `${prefix}${route.path}` : `/${pluginName}${route.path}`;

  return {
    ...route,
    path,
  };
};

const filterContentAPI = (route: Core.Route) => route.info.type === 'content-api';

/**
 * Clean route object to remove circular references for JSON serialization
 */
const cleanRouteForSerialization = (route: Core.Route) => {
  const { request, response, ...cleanRoute } = route;

  // Remove request and response objects that may contain circular references
  return cleanRoute;
};

/**
 * Create a content API container that holds logic, tools and utils. (eg: permissions, ...)
 */
const createContentAPI = (strapi: Core.Strapi) => {
  const getRoutesMap = async () => {
    const routesMap: Record<string, Core.Route[]> = {};

    Object.entries(strapi.apis).forEach(([apiName, api]) => {
      const routes = Object.values(api.routes)
        .flatMap((route) => {
          if ('routes' in route) {
            return route.routes;
          }

          return route;
        })
        .filter(filterContentAPI);

      if (routes.length === 0) {
        return;
      }

      const apiPrefix = strapi.config.get('api.rest.prefix');
      routesMap[`api::${apiName}`] = routes.map((route) =>
        // Apply clean for all routes
        cleanRouteForSerialization({
          ...route,
          path: `${apiPrefix}${route.path}`,
        })
      );
    });

    Object.entries(strapi.plugins).forEach(([pluginName, plugin]) => {
      const transformPrefix = transformRoutePrefixFor(pluginName);

      let routes;
      if (Array.isArray(plugin.routes)) {
        routes = plugin.routes.map(transformPrefix).filter(filterContentAPI);
      } else {
        routes = Object.values(plugin.routes)
          .flatMap((route) => route.routes.map(transformPrefix))
          .filter(filterContentAPI);
      }

      if (routes.length === 0) {
        return;
      }

      const apiPrefix = strapi.config.get('api.rest.prefix');
      routesMap[`plugin::${pluginName}`] = routes.map((route) =>
        // Apply clean for all routes
        cleanRouteForSerialization({
          ...route,
          path: `${apiPrefix}${route.path}`,
        })
      );
    });

    return routesMap;
  };

  const sanitizer = sanitize.createAPISanitizers({
    getModel(uid: string) {
      return strapi.getModel(uid as UID.Schema);
    },
    // NOTE: use lazy access to allow registration of sanitizers after the creation of the container
    get sanitizers() {
      return {
        input: strapi.sanitizers.get('content-api.input'),
        output: strapi.sanitizers.get('content-api.output'),
      };
    },
  });

  const validator = validate.createAPIValidators({
    getModel(uid: string) {
      return strapi.getModel(uid as UID.Schema);
    },
    // NOTE: use lazy access to allow registration of validators after the creation of the container
    get validators() {
      return {
        input: strapi.validators.get('content-api.input'),
      };
    },
  });

  return {
    permissions: instantiatePermissionsUtilities(strapi),
    getRoutesMap,
    sanitize: sanitizer,
    validate: validator,
  };
};

export default createContentAPI;
