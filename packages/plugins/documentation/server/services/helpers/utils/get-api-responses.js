'use strict';

const pascalCase = require('./pascal-case');
/**
 *
 * @param {boolean} isSingleEntity - Checks for a single entity
 * @returns {object} The correctly formatted meta object
 */
const getMeta = isListOfEntities => {
  if (isListOfEntities) {
    return {
      type: 'object',
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

const getSchemaAsArrayOrObject = (isListOfEntities, name) => {
  if (isListOfEntities) {
    return {
      properties: {
        data: {
          type: 'array',
          items: {
            $ref: `#/components/schemas/${pascalCase(name)}`,
          },
        },
        meta: getMeta(isListOfEntities),
      },
    };
  }

  return {
    properties: {
      data: {
        $ref: `#/components/schemas/${pascalCase(name)}`,
      },
      meta: getMeta(isListOfEntities),
    },
  };
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
module.exports = (name, route, isListOfEntities = false) => {
  let schema;
  if (route.method === 'DELETE') {
    schema = {
      type: 'integer',
      format: 'int64',
    };
  } else {
    schema = getSchemaAsArrayOrObject(isListOfEntities, name);
  }

  return {
    responses: {
      '200': {
        description: 'OK',
        content: {
          'application/json': {
            schema,
          },
        },
      },
      '400': {
        description: 'Bad Request',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      '401': {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      '403': {
        description: 'Forbidden',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      '404': {
        description: 'Not Found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      '500': {
        description: 'Internal Server Error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
    },
  };
};
