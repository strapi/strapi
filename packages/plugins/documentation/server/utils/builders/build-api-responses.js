'use strict';

const getSchemaData = require('../get-schema-data');
const cleanSchemaAttributes = require('../clean-schema-attributes');
const errorResponse = require('../error-response');

/**
 *
 * @param {boolean} isSingleEntity - Checks for a single entity
 * @returns {object} The correctly formatted meta object
 */
const getMeta = isListOfEntities => {
  if (isListOfEntities) {
    return {
      properties: {
        pagination: {
          properties: {
            page: { type: 'integer' },
            pageSize: { type: 'integer', minimum: 25 },
            pageCount: { type: 'integer', maximum: 1 },
            total: { type: 'integer' },
          },
        },
      },
    };
  }

  return { type: 'object' };
};

/**
 * @description - Builds the Swagger response object for a given api
 *
 * @param {object} attributes - The attributes found on a contentType
 * @param {object} route - The current route
 * @param {boolean} isListOfEntities - Checks for a list of entitities
 *
 * @returns The Swagger responses
 */
module.exports = (attributes, route, isListOfEntities = false) => {
  let schema;
  if (route.method === 'DELETE') {
    schema = {
      type: 'integer',
      format: 'int64',
    };
  } else {
    schema = {
      properties: {
        data: getSchemaData(isListOfEntities, cleanSchemaAttributes(attributes)),
        meta: getMeta(isListOfEntities),
      },
    };
  }

  return {
    responses: {
      '200': {
        content: {
          'application/json': {
            schema,
          },
        },
      },
      '403': {
        description: 'Forbidden',
        content: {
          'application/json': {
            schema: errorResponse.Error,
          },
        },
      },
      '404': {
        description: 'Not found',
        content: {
          'application/json': {
            schema: errorResponse.Error,
          },
        },
      },
    },
  };
};
