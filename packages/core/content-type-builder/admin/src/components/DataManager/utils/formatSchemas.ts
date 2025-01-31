import { AttributeType, Component, ContentType } from '../../../types';

/**
 * Format the attributes to array instead of an object
 */
export const formatSchemas = <TType extends Component | ContentType>(
  schemas: Record<string, any>
): Record<string, TType> => {
  return Object.keys(schemas).reduce((acc: any, current) => {
    const schema = schemas[current].schema;

    acc[current] = {
      ...schemas[current],
      status: 'UNCHANGED',
      schema: { ...schema, attributes: toAttributesArray(schema.attributes) },
    };

    return acc;
  }, {});
};

export const formatSchema = <TType extends Component | ContentType>(
  schema: Record<string, any>
): TType => {
  return {
    ...schema,
    schema: { ...schema, attributes: toAttributesArray(schema.attributes) },
  } as TType;
};

export const toAttributesArray = (attributes: Record<string, AttributeType>) => {
  return Object.keys(attributes).reduce((acc: AttributeType[], current: any) => {
    acc.push({ ...attributes[current], name: current });

    return acc;
  }, []);
};
