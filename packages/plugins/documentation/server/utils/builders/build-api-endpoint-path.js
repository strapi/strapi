'use strict';

const _ = require('lodash');
const pathToRegexp = require('path-to-regexp');

const queryParams = require('../query-params');
const buildApiRequests = require('./build-api-requests');
const buildApiResponses = require('./build-api-responses');

/**
 * @description Parses a route with ':variable'
 *
 * @param {string} routePath - The route's path property
 * @returns '{variable}'
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
 * @returns Swagger path params object
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
 * @param {array} routes - The routes for a given api or plugin
 * @param {object} attributes - The attributes for a given api or plugin
 * @param {string} tag - A descriptor for OpenAPI
 *
 * @returns object of OpenAPI paths for each route
 */
const getPaths = ({ routeInfo, attributes, tag }) => {
  const paths = routeInfo.routes.reduce(
    (acc, route) => {
      // TODO: Find a more reliable way to determine list of entities vs a single entity
      const isListOfEntities = route.handler.split('.').pop() === 'find';
      const hasPathParams = route.path.includes('/:');
      const methodVerb = route.method.toLowerCase();
      const pathWithPrefix = routeInfo.prefix ? `${routeInfo.prefix}/${route.path}` : route.path;
      const routePath = hasPathParams ? parsePathWithVariables(pathWithPrefix) : pathWithPrefix;

      const { responses } = buildApiResponses(attributes, route, isListOfEntities);
      _.set(acc.paths, `${routePath}.${methodVerb}.responses`, responses);
      _.set(acc.paths, `${routePath}.${methodVerb}.tags`, [_.upperFirst(tag)]);

      if (isListOfEntities) {
        _.set(acc.paths, `${routePath}.${methodVerb}.parameters`, queryParams);
      }

      if (hasPathParams) {
        const pathParams = getPathParams(route.path);
        _.set(acc.paths, `${routePath}.${methodVerb}.parameters`, pathParams);
      }

      if (methodVerb === 'post' || methodVerb === 'put') {
        const { requestBody } = buildApiRequests(attributes, route);

        _.set(acc.paths, `${routePath}.${methodVerb}.requestBody`, requestBody);
      }

      return acc;
    },
    { paths: {} }
  );

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
 * @returns
 */
module.exports = api => {
  if (!api.ctNames.length && api.getter === 'plugin') {
    // Set arbitrary attributes
    const attributes = { foo: { type: 'string' } };
    const routeInfo = strapi.plugin(api.name).routes['admin'];

    const apiInfo = {
      routeInfo,
      attributes,
      tag: api.name,
    };
    return getPaths(apiInfo);
  }

  // An api could have multiple contentTypes
  for (const contentTypeName of api.ctNames) {
    // Get the attributes found on the api's contentType
    const uid = `${api.getter}::${api.name}.${contentTypeName}`;
    const ct = strapi.contentType(uid);
    const attributes = ct.attributes;

    // Get the routes for the current api
    const routeInfo =
      api.getter === 'plugin'
        ? strapi.plugin(api.name).routes['content-api']
        : strapi.api[api.name].routes[contentTypeName];

    // Parse an identifier for OpenAPI tag if the api name and contentType name don't match
    const tag = api.name === contentTypeName ? api.name : `${api.name} - ${contentTypeName}`;
    const apiInfo = {
      routeInfo,
      attributes,
      tag,
    };
    return getPaths(apiInfo);
  }
};
