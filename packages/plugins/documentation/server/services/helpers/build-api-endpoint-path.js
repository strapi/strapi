'use strict';

const _ = require('lodash');
const pathToRegexp = require('path-to-regexp');

const pascalCase = require('./utils/pascal-case');
const queryParams = require('./utils/query-params');
const loopContentTypeNames = require('./utils/loop-content-type-names');
const getApiResponses = require('./utils/get-api-responses');

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
 * @param {string} prefix - The route prefix
 * @param {string} path - The route path
 *
 * @returns {string}
 */
const getPathWithPrefix = (prefix, path) => {
  if (path.includes('localizations')) {
    return path;
  }

  if (path.endsWith('/')) {
    return prefix;
  }

  return prefix.concat(path);
};

/**
 * @description Get's all paths based on routes
 *
 * @param {object} apiInfo
 * @property {object} apiInfo.routeInfo - The api routes object
 * @property {string} apiInfo.uniqueName - Content type name | Api name + Content type name
 *
 * @returns {object}
 */
const getPaths = ({ routeInfo, uniqueName }) => {
  const paths = routeInfo.routes.reduce((acc, route) => {
    // TODO: Find a more reliable way to determine list of entities vs a single entity
    const isListOfEntities = route.handler.split('.').pop() === 'find';
    const methodVerb = route.method.toLowerCase();

    const hasPathParams = route.path.includes('/:');
    const pathWithPrefix = routeInfo.prefix
      ? getPathWithPrefix(routeInfo.prefix, route.path)
      : route.path;
    const routePath = hasPathParams ? parsePathWithVariables(pathWithPrefix) : pathWithPrefix;

    const { responses } = getApiResponses(uniqueName, route, isListOfEntities);

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
      const requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: `#/components/schemas/New${pascalCase(uniqueName)}`,
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
 * @decription Gets all open api paths object for a given content type
 *
 * @param {object} apiInfo
 * @property {string} apiInfo.name - The name of the api
 * @property {string} apiInfo.getter - api | plugin
 * @property {array} apiInfo.ctNames - All contentType names on the api
 * @property {string} apiInfo.uniqueName - Api name | Api name + Content type name
 * @property {object} apiInfo.attributes - Attributes on content type
 * @property {object} apiInfo.routeInfo - The routes for the api
 *
 * @returns {object} Open API paths
 */
const getAllPathsForContentType = ({
  name,
  getter,
  ctNames,
  uniqueName,
  routeInfo,
  attributes,
}) => {
  let paths = {};
  if (!ctNames.length && getter === 'plugin') {
    const routeInfo = strapi.plugin(name).routes['admin'];

    const apiInfo = {
      routeInfo,
      uniqueName,
    };

    paths = {
      ...paths,
      ...getPaths(apiInfo),
    };

    return getPaths(apiInfo);
  }

  const apiInfo = {
    routeInfo,
    attributes,
    uniqueName,
  };

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
  return loopContentTypeNames(api, getAllPathsForContentType);
};

module.exports = buildApiEndpointPath;
