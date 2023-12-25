import _ from 'lodash';
import type { Strapi, Common } from '@strapi/types';
import instantiatePermissionsUtilities from './permissions';

const transformRoutePrefixFor = (pluginName: string) => (route: Common.Route) => {
  const prefix = route.config && route.config.prefix;
  const path = prefix !== undefined ? `${prefix}${route.path}` : `/${pluginName}${route.path}`;

  return {
    ...route,
    path,
  };
};

const filterContentAPI = (route: Common.Route) => route.info.type === 'content-api';

/**
 * Create a content API container that holds logic, tools and utils. (eg: permissions, ...)
 */
const createContentAPI = (strapi: Strapi) => {
  const getRoutesMap = async () => {
    const routesMap: Record<string, Common.Route[]> = {};

    _.forEach(strapi.api, (api, apiName) => {
      const routes = _.flatMap(api.routes, (route) => {
        if ('routes' in route) {
          return route.routes;
        }

        return route;
      }).filter(filterContentAPI);

      if (routes.length === 0) {
        return;
      }

      const apiPrefix = strapi.config.get('api.rest.prefix');
      routesMap[`api::${apiName}`] = routes.map((route) => ({
        ...route,
        path: `${apiPrefix}${route.path}`,
      }));
    });

    _.forEach(strapi.plugins, (plugin, pluginName) => {
      const transformPrefix = transformRoutePrefixFor(pluginName);

      if (Array.isArray(plugin.routes)) {
        return plugin.routes.map(transformPrefix).filter(filterContentAPI);
      }

      const routes = _.flatMap(plugin.routes, (route) => route.routes.map(transformPrefix)).filter(
        filterContentAPI
      );

      if (routes.length === 0) {
        return;
      }

      const apiPrefix = strapi.config.get('api.rest.prefix');
      routesMap[`plugin::${pluginName}`] = routes.map((route) => ({
        ...route,
        path: `${apiPrefix}${route.path}`,
      }));
    });

    return routesMap;
  };

  return {
    permissions: instantiatePermissionsUtilities(strapi),
    getRoutesMap,
  };
};

export default createContentAPI;
