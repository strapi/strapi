import type { OpenAPIV3_1 } from 'openapi-types';

/**
 * @description Determines the format of the data response
 *
 * @param {boolean} isListOfEntities - Checks for a multiple entities
 * @param {object} attributes - The attributes found on a contentType

 * @returns object | array of attributes
 */
export default (
  isListOfEntities: boolean,
  attributes: Record<string, OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject>
): OpenAPIV3_1.SchemaObject => {
  if (isListOfEntities) {
    return {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { oneOf: [{ type: 'string' }, { type: 'number' }] },
          documentId: { type: 'string' },
          ...attributes,
        },
      },
    };
  }

  return {
    type: 'object',
    properties: {
      id: { oneOf: [{ type: 'string' }, { type: 'number' }] },
      documentId: { type: 'string' },
      ...attributes,
    },
  };
};
