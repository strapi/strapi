import type { Schema } from '@strapi/types';

export const hasDefaultAttribute = (
  attribute: Schema.Attribute.AnyAttribute
): attribute is Schema.Attribute.AnyAttribute & Schema.Attribute.DefaultOption<unknown> => {
  return 'default' in attribute;
};
