import _ from 'lodash';

import type { OpenAPIV3 } from 'openapi-types';
import type { Core, Struct } from '@strapi/types';

import cleanSchemaAttributes from './utils/clean-schema-attributes';
import loopContentTypeNames from './utils/loop-content-type-names';
import pascalCase from './utils/pascal-case';
import { hasFindMethod } from './utils/routes';

import type { Api, ApiInfo } from '../../types';

const getRequiredAttributes = (allAttributes: Struct.SchemaAttributes) => {
  const requiredAttributes: string[] = [];

  for (const key in allAttributes) {
    if (allAttributes[key].required) {
      requiredAttributes.push(key);
    }
  }

  return requiredAttributes;
};

/**
 * @decription Get all open api schema objects for a given content type
 *
 * @param {object} apiInfo
 * @property {string} apiInfo.uniqueName - Api name | Api name + Content type name
 * @property {object} apiInfo.attributes - Attributes on content type
 * @property {object} apiInfo.routeInfo - The routes for the api
 *
 * @returns {object} Open API schemas
 */
const getAllSchemasForContentType = ({ routeInfo, attributes, uniqueName }: ApiInfo) => {
  // Store response and request schemas in an object
  let strapiComponentSchemas = {};
  const schemas: OpenAPIV3.ComponentsObject = {};
  const typeName = pascalCase(uniqueName);

  // adds a ComponentSchema to the Schemas so it can be used as Ref
  const didAddStrapiComponentsToSchemas = (schemaName: string, schema: OpenAPIV3.SchemaObject) => {
    if (!Object.keys(schema) || !Object.keys(schema.properties!)) return false;

    // Add the Strapi components to the schema
    strapiComponentSchemas = {
      ...strapiComponentSchemas,
      [schemaName]: schema,
    };

    return true;
  };

  // Get all the route methods
  const routeMethods = routeInfo.routes.map((route: Core.Route) => route.method);

  const attributesToOmit = [
    'createdAt',
    'updatedAt',
    'publishedAt',
    'publishedBy',
    'updatedBy',
    'createdBy',
  ];

  const attributesForRequest = _.omit(attributes, attributesToOmit);
  // Get a list of required attribute names
  const requiredRequestAttributes = getRequiredAttributes(attributesForRequest);
  // Build the request schemas when the route has POST or PUT methods
  if (routeMethods.includes('POST') || routeMethods.includes('PUT')) {
    // Build localization requests schemas

    // Build the request schema
    Object.assign(schemas, {
      [`${typeName}Request`]: {
        type: 'object',
        required: ['data'],
        properties: {
          data: {
            ...(requiredRequestAttributes.length && { required: requiredRequestAttributes }),
            type: 'object',
            properties: cleanSchemaAttributes(attributesForRequest, {
              isRequest: true,
              didAddStrapiComponentsToSchemas,
            }),
          },
        },
      },
    });
  }

  // Check for routes that need to return a list
  const hasListOfEntities = routeInfo.routes.filter((route: Core.Route) =>
    hasFindMethod(route.handler)
  ).length;

  if (hasListOfEntities) {
    // Build the list response schema
    Object.assign(schemas, {
      [`${typeName}ListResponse`]: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {
              $ref: `#/components/schemas/${typeName}`,
            },
          },
          meta: {
            type: 'object',
            properties: {
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'integer' },
                  pageSize: { type: 'integer', minimum: 25 },
                  pageCount: { type: 'integer', maximum: 1 },
                  total: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    });
  }

  const requiredAttributes = getRequiredAttributes(attributes);
  // Build the response schema
  Object.assign(schemas, {
    [`${typeName}`]: {
      type: 'object',
      ...(requiredAttributes.length && { required: requiredAttributes }),
      properties: {
        id: { type: 'number' },
        documentId: { type: 'string' },
        ...cleanSchemaAttributes(attributes, { didAddStrapiComponentsToSchemas }),
      },
    },

    [`${typeName}Response`]: {
      type: 'object',
      properties: {
        data: {
          $ref: `#/components/schemas/${typeName}`,
        },
        meta: { type: 'object' },
      },
    },
  });

  return { ...schemas, ...strapiComponentSchemas };
};

const buildComponentSchema = (api: Api) => {
  // A reusable loop for building paths and component schemas
  // Uses the api param to build a new set of params for each content type
  // Passes these new params to the function provided
  return loopContentTypeNames(api, getAllSchemasForContentType);
};

export default buildComponentSchema;
