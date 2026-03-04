import { Component, ContentType, AnyAttribute } from '../../../types';

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
