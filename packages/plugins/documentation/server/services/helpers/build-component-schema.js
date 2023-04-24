'use strict';

const _ = require('lodash');

const cleanSchemaAttributes = require('./utils/clean-schema-attributes');
const loopContentTypeNames = require('./utils/loop-content-type-names');
const pascalCase = require('./utils/pascal-case');
const { hasFindMethod, isLocalizedPath } = require('./utils/routes');

const getRequiredAttributes = (allAttributes) => {
  return Object.entries(allAttributes).reduce((acc, attribute) => {
    const [attributeKey, attributeValue] = attribute;

    if (attributeValue.required) {
      acc.push(attributeKey);
    }

    return acc;
  }, []);
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
const getAllSchemasForContentType = ({ routeInfo, attributes, uniqueName }) => {
  // Store response and request schemas in an object
  let schemas = {};
  let strapiComponentSchemas = {};
  // adds a ComponentSchema to the Schemas so it can be used as Ref
  const didAddStrapiComponentsToSchemas = (schemaName, schema) => {
    if (!Object.keys(schema) || !Object.keys(schema.properties)) return false;

    // Add the Strapi components to the schema
    strapiComponentSchemas = {
      ...strapiComponentSchemas,
      [schemaName]: schema,
    };

    return true;
  };
  // Get all the route methods
  const routeMethods = routeInfo.routes.map((route) => route.method);
  // Check for localized paths
  const hasLocalizationPath = routeInfo.routes.filter((route) =>
    isLocalizedPath(route.path)
  ).length;

  const attributesToOmit = [
    'createdAt',
    'updatedAt',
    'publishedAt',
    'publishedBy',
    'updatedBy',
    'createdBy',
    'localizations',
  ];
  const attributesForRequest = _.omit(attributes, attributesToOmit);
  // Get a list of required attribute names
  const requiredRequestAttributes = getRequiredAttributes(attributesForRequest);
  // Build the request schemas when the route has POST or PUT methods
  if (routeMethods.includes('POST') || routeMethods.includes('PUT')) {
    // Build localization requests schemas
    if (hasLocalizationPath) {
      schemas = {
        ...schemas,
        [`${pascalCase(uniqueName)}LocalizationRequest`]: {
          required: [...requiredRequestAttributes, 'locale'],
          type: 'object',
          properties: cleanSchemaAttributes(attributesForRequest, {
            isRequest: true,
            didAddStrapiComponentsToSchemas,
          }),
        },
      };
    }

    // Build the request schema
    schemas = {
      ...schemas,
      [`${pascalCase(uniqueName)}Request`]: {
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
    };
  }

  // Build the localization response schema
  if (hasLocalizationPath) {
    schemas = {
      ...schemas,
      [`${pascalCase(uniqueName)}ResponseDataObjectLocalized`]: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          attributes: {
            $ref: `#/components/schemas/${pascalCase(uniqueName)}`,
          },
        },
      },
      [`${pascalCase(uniqueName)}LocalizationResponse`]: {
        type: 'object',
        properties: {
          data: {
            $ref: `#/components/schemas/${pascalCase(uniqueName)}ResponseDataObjectLocalized`,
          },
          meta: { type: 'object' },
        },
      },
    };
  }

  // Check for routes that need to return a list
  const hasListOfEntities = routeInfo.routes.filter((route) => hasFindMethod(route.handler)).length;
  if (hasListOfEntities) {
    // Buld the localized list response schema
    if (hasLocalizationPath) {
      schemas = {
        ...schemas,
        [`${pascalCase(uniqueName)}ListResponseDataItemLocalized`]: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            attributes: {
              $ref: `#/components/schemas/${pascalCase(uniqueName)}`,
            },
          },
        },
        [`${pascalCase(uniqueName)}LocalizationListResponse`]: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                $ref: `#/components/schemas/${pascalCase(uniqueName)}ListResponseDataItemLocalized`,
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
      };
    }
    // Build the list response schema
    schemas = {
      ...schemas,
      [`${pascalCase(uniqueName)}ListResponseDataItem`]: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          attributes: {
            $ref: `#/components/schemas/${pascalCase(uniqueName)}`,
          },
        },
      },
      [`${pascalCase(uniqueName)}ListResponse`]: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {
              $ref: `#/components/schemas/${pascalCase(uniqueName)}ListResponseDataItem`,
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
    };
  }

  const requiredAttributes = getRequiredAttributes(attributes);
  // Build the response schema
  schemas = {
    ...schemas,
    [`${pascalCase(uniqueName)}`]: {
      type: 'object',
      ...(requiredAttributes.length && { required: requiredAttributes }),
      properties: cleanSchemaAttributes(attributes, {
        didAddStrapiComponentsToSchemas,
        componentSchemaRefName: `#/components/schemas/${pascalCase(uniqueName)}`,
      }),
    },
    [`${pascalCase(uniqueName)}ResponseDataObject`]: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        attributes: {
          $ref: `#/components/schemas/${pascalCase(uniqueName)}`,
        },
      },
    },
    [`${pascalCase(uniqueName)}Response`]: {
      type: 'object',
      properties: {
        data: {
          $ref: `#/components/schemas/${pascalCase(uniqueName)}ResponseDataObject`,
        },
        meta: { type: 'object' },
      },
    },
  };

  return { ...schemas, ...strapiComponentSchemas };
};

const buildComponentSchema = (api) => {
  // A reusable loop for building paths and component schemas
  // Uses the api param to build a new set of params for each content type
  // Passes these new params to the function provided
  return loopContentTypeNames(api, getAllSchemasForContentType);
};

module.exports = buildComponentSchema;
