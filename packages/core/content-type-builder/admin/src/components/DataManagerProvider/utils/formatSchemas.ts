import { AttributeType } from '../../../types';

/**
 * Format the attributes to array instead of an object
 */
export const formatSchemas = (schemas: Record<string, any>) => {
  return Object.keys(schemas).reduce((acc: any, current) => {
    const schema = schemas[current].schema;

    acc[current] = {
      ...schemas[current],
      schema: { ...schema, attributes: toAttributesArray(schema.attributes) },
    };

    return acc;
  }, {});
};

export const toAttributesArray = (attributes: Record<string, AttributeType>) => {
  return Object.keys(attributes).reduce((acc: AttributeType[], current: any) => {
    acc.push({ ...attributes[current], name: current });

    return acc;
  }, []);
};
