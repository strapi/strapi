import { Component, ContentType, AnyAttribute } from '../../../types';

/**
 * Format the attributes to array instead of an object
 */
export const formatSchemas = <TType extends Component | ContentType>(
  schemas: any[]
): Record<string, TType> => {
  return schemas.reduce((acc: any, schema) => {
    acc[schema.uid] = {
      status: 'UNCHANGED',
      ...schema,
      attributes: toAttributesArray(schema.attributes),
    };

    return acc;
  }, {});
};

export const formatSchema = <TType extends Component | ContentType>(
  schema: Record<string, any>
): TType => {
  return {
    ...schema,
    attributes: toAttributesArray(schema.attributes),
  } as TType;
};

export const toAttributesArray = (attributes: Record<string, any>) => {
  return Object.keys(attributes).reduce((acc, current: any) => {
    acc.push({ ...attributes[current], name: current });

    return acc;
  }, [] as AnyAttribute[]);
};
