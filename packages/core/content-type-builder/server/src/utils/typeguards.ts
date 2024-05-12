import type { Attribute } from '@strapi/types';

export const hasDefaultAttribute = (
  attribute: Attribute.Any
): attribute is Attribute.Any & Attribute.DefaultOption<unknown> => {
  return 'default' in attribute;
};
