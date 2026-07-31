import type { OpenAPIV3_1 } from 'openapi-types';

/**
 * Query params whose values are open-ended records parsed from bracket notation
 * (e.g. filters[title][$eq]=hello). These are described as deepObject in OpenAPI
 * rather than expanded into fixed sub-keys.
 */
export const DEEP_OBJECT_QUERY_PARAMS = new Set(['filters']);

export const shouldUseDeepObjectStyle = (
  name: string,
  schema: OpenAPIV3_1.SchemaObject
): boolean => {
  if (DEEP_OBJECT_QUERY_PARAMS.has(name)) {
    return true;
  }

  return (
    schema.type === 'object' &&
    (!schema.properties || Object.keys(schema.properties).length === 0) &&
    schema.additionalProperties !== undefined &&
    schema.additionalProperties !== false
  );
};

export const hasExpandableObjectProperties = (schema: OpenAPIV3_1.SchemaObject): boolean => {
  return Boolean(
    schema.type === 'object' && schema.properties && Object.keys(schema.properties).length > 0
  );
};
