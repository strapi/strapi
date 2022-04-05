'use strict';

const pascalCase = require('./pascal-case');

/**
 * @description - Builds the Swagger response object for a given api
 *
 * @param {object} name - Name of the api or plugin
 * @param {object} route - The current route
 * @param {boolean} isListOfEntities - Checks for a list of entitities
 *
 * @returns The Swagger responses
 */
const getApiResponse = (name, route, isListOfEntities = false) => {
  const getSchema = () => {
    if (route.method === 'DELETE') {
      return {
        type: 'integer',
        format: 'int64',
      };
    }

    if (isListOfEntities) {
      return { $ref: `#/components/schemas/${pascalCase(name)}ListResponse` };
    }

    return { $ref: `#/components/schemas/${pascalCase(name)}Response` };
  };

  const schema = getSchema();

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

module.exports = getApiResponse;
