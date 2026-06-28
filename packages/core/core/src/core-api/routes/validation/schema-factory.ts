import type { Core, Schema } from '@strapi/types';
import * as z from 'zod/v4';

import { mapAttributeToInputSchema, mapAttributeToSchema } from './mappers';

/**
 * Creates a Zod schema for a collection of Strapi attributes.
 */
export const createAttributesSchema = (
  strapi: Core.Strapi,
  attributes: [name: string, attribute: Schema.Attribute.AnyAttribute][]
) => {
  return attributes.reduce((acc, [name, attribute]) => {
    return acc.extend({
      get [name]() {
        return mapAttributeToSchema(strapi, attribute);
      },
    });
  }, z.object({}));
};

/**
 * Creates a Zod input schema for a collection of Strapi attributes.
 */
export const createAttributesInputSchema = (
  strapi: Core.Strapi,
  attributes: [name: string, attribute: Schema.Attribute.AnyAttribute][]
) => {
  return attributes.reduce((acc, [name, attribute]) => {
    return acc.extend({
      get [name]() {
        return mapAttributeToInputSchema(strapi, attribute);
      },
    });
  }, z.object({}));
};
