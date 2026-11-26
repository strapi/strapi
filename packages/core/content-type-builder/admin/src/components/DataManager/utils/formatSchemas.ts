import type { AnyAttribute } from '../../../types';

type AttributeInput = Omit<AnyAttribute, 'name'>;

export const formatSchema = <TSchema extends { attributes: Record<string, AttributeInput> }>(
  schema: TSchema
) => {
  return {
    ...schema,
    attributes: toAttributesArray(schema.attributes),
  };
};

export const toAttributesArray = (attributes: Record<string, AttributeInput>): AnyAttribute[] => {
  return Object.entries(attributes).reduce((acc, [name, attribute]) => {
    acc.push({ ...attribute, name } as AnyAttribute);

    return acc;
  }, [] as AnyAttribute[]);
};
