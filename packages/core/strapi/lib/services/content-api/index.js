'use strict';

const _ = require('lodash');
const instantiatePermissionsUtilities = require('./permissions');

const transformRoutePrefixFor = (pluginName) => (route) => {
  const prefix = route.config && route.config.prefix;
  const path = prefix !== undefined ? `${prefix}${route.path}` : `/${pluginName}${route.path}`;

  return {
    ...route,
    path,
  };
};

/**
 * Create a content API container that holds logic, tools and utils. (eg: permissions, ...)
 */
const createContentAPI = (strapi) => {
  const getRoutesMap = async () => {
    const routesMap = {};

    _.forEach(strapi.api, (api, apiName) => {
      const routes = _.flatMap(api.routes, (route) => {
        if (_.has(route, 'routes')) {
          return route.routes;
        }

        return route;
      }).filter((route) => route.info.type === 'content-api');

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

      const routes = _.flatMap(plugin.routes, (route) => {
        if (_.has(route, 'routes')) {
          return route.routes.map(transformPrefix);
        }

        return transformPrefix(route);
      }).filter((route) => route.info.type === 'content-api');

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

module.exports = createContentAPI;
