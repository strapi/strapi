import type { OpenAPIV3 } from 'openapi-types';

/**
 * @description Determines the format of the data response
 *
 * @param {boolean} isListOfEntities - Checks for a multiple entities
 * @param {object} attributes - The attributes found on a contentType

 * @returns object | array of attributes
 */
export default (
  isListOfEntities: boolean,
  attributes: Record<string, OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject>
): OpenAPIV3.SchemaObject => {
  if (isListOfEntities) {
    return {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          documentId: { type: 'string' },
          ...attributes,
        },
      },
    };
  }

  return {
    type: 'object',
    properties: {
      id: { type: 'number' },
      documentId: { type: 'string' },
      ...attributes,
    },
  };
};
