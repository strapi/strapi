'use strict';

const _ = require('lodash');
const pathToRegexp = require('path-to-regexp');

const pascalCase = require('./utils/pascal-case');
const queryParams = require('./utils/query-params');
const loopContentTypeNames = require('./utils/loop-content-type-names');
const getApiResponses = require('./utils/get-api-responses');
const { hasFindMethod, isLocalizedPath } = require('./utils/routes');

/**
 * @description Parses a route with ':variable'
 *
 * @param {string} routePath - The route's path property
 * @returns {string}
 */
const parsePathWithVariables = routePath => {
  return pathToRegexp
    .parse(routePath)
    .map(token => {
      if (_.isObject(token)) {
        return token.prefix + '{' + token.name + '}';
      }

      return token;
    })
    .join('');
};

/**
 * @description Builds the required object for a path parameter
 *
 * @param {string} routePath - The route's path property
 *
 * @returns {object } Swagger path params object
 */
const getPathParams = routePath => {
  return pathToRegexp
    .parse(routePath)
    .filter(token => _.isObject(token))
    .map(param => {
      return {
        name: param.name,
        in: 'path',
        description: '',
        deprecated: false,
        required: true,
        schema: { type: 'string' },
      };
    });
};

/**
 *
 * @param {string} prefix - The prefix found on the routes object
 * @param {string} route - The current route
 * @property {string} route.path - The current route's path
 * @property {object} route.config - The current route's config object
 *
 * @returns {string}
 */
const getPathWithPrefix = (prefix, route) => {
  // When the prefix is set on the routes and
  // the current route is not trying to remove it
  if (prefix && !_.has(route.config, 'prefix')) {
    // Add the prefix to the path
    return prefix.concat(route.path);
  }

  // Otherwise just return path
  return route.path;
};
/**
 * @description Gets all paths based on routes
 *
 * @param {object} apiInfo
 * @property {object} apiInfo.routeInfo - The api routes object
 * @property {string} apiInfo.uniqueName - Content type name | Api name + Content type name
 * @property {object} apiInfo.contentTypeInfo - The info object found on content type schemas
 *
 * @returns {object}
 */
const getPaths = ({ routeInfo, uniqueName, contentTypeInfo }) => {
  // Get the routes for the current content type
  const contentTypeRoutes = routeInfo.routes.filter(route => {
    return (
      route.path.includes(contentTypeInfo.pluralName) ||
      route.path.includes(contentTypeInfo.singularName)
    );
  });

  const paths = contentTypeRoutes.reduce((acc, route) => {
    // TODO: Find a more reliable way to determine list of entities vs a single entity
    const isListOfEntities = hasFindMethod(route.handler);
    const isLocalizationPath = isLocalizedPath(route.path);
    const methodVerb = route.method.toLowerCase();
    const hasPathParams = route.path.includes('/:');
    const pathWithPrefix = getPathWithPrefix(routeInfo.prefix, route);
    const routePath = hasPathParams ? parsePathWithVariables(pathWithPrefix) : pathWithPrefix;
    const { responses } = getApiResponses({
      uniqueName,
      route,
      isListOfEntities,
      isLocalizationPath,
    });

    const swaggerConfig = {
      responses,
      tags: [_.upperFirst(uniqueName)],
      parameters: [],
      operationId: `${methodVerb}${routePath}`,
    };

    if (isListOfEntities) {
      swaggerConfig.parameters.push(...queryParams);
    }

    if (hasPathParams) {
      const pathParams = getPathParams(route.path);
      swaggerConfig.parameters.push(...pathParams);
    }

    if (['post', 'put'].includes(methodVerb)) {
      const refName = isLocalizationPath ? 'LocalizationRequest' : 'Request';
      const requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: `#/components/schemas/${pascalCase(uniqueName)}${refName}`,
            },
          },
        },
      };

      swaggerConfig.requestBody = requestBody;
    }

    _.set(acc, `${routePath}.${methodVerb}`, swaggerConfig);

    return acc;
  }, {});

  return paths;
};

/**
 * @description Gets all open api paths object for a given content type
 *
 * @param {object} apiInfo
 *
 * @returns {object} Open API paths
 */
const getAllPathsForContentType = apiInfo => {
  let paths = {};

  const pathsObject = getPaths(apiInfo);

  paths = {
    ...paths,
    ...pathsObject,
  };

  return paths;
};

/**
 * @description - Builds the Swagger paths object for each api
 *
 * @param {object} api - Information about the current api
 * @property {string} api.name - The name of the api
 * @property {string} api.getter - The getter for the api (api | plugin)
 * @property {array} api.ctNames - The name of all contentTypes found on the api
 *
 * @returns {object}
 */
const buildApiEndpointPath = api => {
  // A reusable loop for building paths and component schemas
  // Uses the api param to build a new set of params for each content type
  // Passes these new params to the function provided
  return loopContentTypeNames(api, getAllPathsForContentType);
};

module.exports = buildApiEndpointPath;
