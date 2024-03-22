import _ from 'lodash';
import * as pathToRegexp from 'path-to-regexp';

import type { Core } from '@strapi/types';
import type { OpenAPIV3 } from 'openapi-types';

import pascalCase from './utils/pascal-case';
import queryParams from './utils/query-params';
import loopContentTypeNames from './utils/loop-content-type-names';
import getApiResponses from './utils/get-api-responses';
import { hasFindMethod } from './utils/routes';

import type { Api, ApiInfo } from '../../types';

/**
 * @description Parses a route with ':variable'
 *
 * @param {string} routePath - The route's path property
 * @returns {string}
 */
const parsePathWithVariables = (routePath: string) => {
  return pathToRegexp
    .parse(routePath)
    .map((token) => {
      if (_.isObject(token)) {
        return `${token.prefix}{${token.name}}`;
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
const getPathParams = (routePath: string): OpenAPIV3.ParameterObject[] => {
  return pathToRegexp.parse(routePath).reduce((acc, param) => {
    if (!(typeof param === 'object')) {
      return acc;
    }

    acc.push({
      name: `${param.name}`,
      in: 'path',
      description: '',
      deprecated: false,
      required: true,
      schema: { type: 'number' },
    });

    return acc;
  }, [] as OpenAPIV3.ParameterObject[]);
};

const getPathWithPrefix = (prefix: string | undefined, route: Core.Route) => {
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
const getPaths = ({ routeInfo, uniqueName, contentTypeInfo, kind }: ApiInfo) => {
  // Get the routes for the current content type
  const contentTypeRoutes = routeInfo.routes.filter((route) => {
    return (
      route.path.includes(contentTypeInfo.pluralName) ||
      route.path.includes(contentTypeInfo.singularName)
    );
  });

  const paths = contentTypeRoutes.reduce((acc: any, route: Core.Route) => {
    // TODO: Find a more reliable way to determine list of entities vs a single entity
    const isListOfEntities = hasFindMethod(route.handler);
    const methodVerb = route.method.toLowerCase();
    const hasPathParams = route.path.includes('/:');
    const pathWithPrefix = getPathWithPrefix(routeInfo.prefix, route);
    const routePath = hasPathParams ? parsePathWithVariables(pathWithPrefix) : pathWithPrefix;

    const responses = getApiResponses({
      uniqueName,
      route,
      isListOfEntities: kind !== 'singleType' && isListOfEntities,
    });

    const swaggerConfig: OpenAPIV3.OperationObject = {
      responses,
      tags: [_.upperFirst(uniqueName)],
      parameters: [],
      operationId: `${methodVerb}${routePath}`,
    };

    if (isListOfEntities) {
      swaggerConfig.parameters?.push(...queryParams);
    }

    if (hasPathParams) {
      const pathParams = getPathParams(route.path);
      swaggerConfig.parameters?.push(...pathParams);
    }

    if (['post', 'put'].includes(methodVerb)) {
      const refName = 'Request';
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
 * @description - Builds the Swagger paths object for each api
 */
const buildApiEndpointPath = (api: Api) => {
  // A reusable loop for building paths and component schemas
  // Uses the api param to build a new set of params for each content type
  // Passes these new params to the function provided
  return loopContentTypeNames(api, getPaths);
};

export default buildApiEndpointPath;
