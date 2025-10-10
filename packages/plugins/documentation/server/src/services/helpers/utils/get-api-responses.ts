import type { OpenAPIV3 } from 'openapi-types';
import pascalCase from './pascal-case';

interface Options {
  uniqueName: string;
  route: {
    method: string;
  };
  isListOfEntities?: boolean;
  isLocalizationPath?: boolean;
}

/**
 * @description - Builds the Swagger response object for a given api
 */
const getApiResponse = ({
  uniqueName,
  route,
  isListOfEntities = false,
}: Options): OpenAPIV3.ResponsesObject => {
  const getSchema = (): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject => {
    if (route.method === 'DELETE') {
      return {
        type: 'integer',
        format: 'int64',
      };
    }

    if (isListOfEntities) {
      return { $ref: `#/components/schemas/${pascalCase(uniqueName)}ListResponse` };
    }

    return { $ref: `#/components/schemas/${pascalCase(uniqueName)}Response` };
  };

  const schema = getSchema();

  return {
    200: {
      description: 'OK',
      content: {
        'application/json': {
          schema,
        },
      },
    },
    400: {
      description: 'Bad Request',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/Error',
          },
        },
      },
    },
    401: {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/Error',
          },
        },
      },
    },
    403: {
      description: 'Forbidden',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/Error',
          },
        },
      },
    },
    404: {
      description: 'Not Found',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/Error',
          },
        },
      },
    },
    500: {
      description: 'Internal Server Error',
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/Error',
          },
        },
      },
    },
  };
};

export default getApiResponse;
