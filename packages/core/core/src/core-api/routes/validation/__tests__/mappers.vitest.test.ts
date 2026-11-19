import { describe, test, expect } from 'vitest';
import type { Core, Schema } from '@strapi/types';
import * as z from 'zod/v4';

import { mapAttributeToInputSchema, mapAttributeToSchema } from '../mappers';

const createStrapi = (customFields: Record<string, { type: string }>) =>
  ({
    get(name: string) {
      if (name !== 'custom-fields') {
        throw new Error(`Unexpected registry: ${name}`);
      }

      return { get: (uid: string) => customFields[uid] };
    },
  } as unknown as Core.Strapi);

// A custom field registered with `type: 'enumeration'` and no `enum` option in the admin
// produces an attribute without `enum`. At register time, `convertCustomFieldType` rewrites
// such an attribute to `type: 'enumeration'` and keeps it without `enum`.
const enumerationWithoutValues = {
  type: 'enumeration',
  customField: 'global::no-enum',
} as unknown as Schema.Attribute.AnyAttribute;

const customFieldWithoutValues = {
  type: 'customField',
  customField: 'global::no-enum',
} as unknown as Schema.Attribute.AnyAttribute;

const strapi = createStrapi({ 'global::no-enum': { type: 'enumeration' } });

describe.each([
  ['mapAttributeToSchema', mapAttributeToSchema],
  ['mapAttributeToInputSchema', mapAttributeToInputSchema],
])('%s with an enumeration that has no enum values', (_name, mapAttribute) => {
  test.each([
    ['an enumeration attribute', enumerationWithoutValues],
    ['an enumeration custom field attribute', customFieldWithoutValues],
  ])('builds a schema for %s', (_label, attribute) => {
    expect(() => mapAttribute(strapi, attribute)).not.toThrow();
  });

  test('rejects every value, as the entity validator does', () => {
    const schema = mapAttribute(strapi, customFieldWithoutValues);

    expect(schema.safeParse('anything').success).toBe(false);
    expect(schema.safeParse(undefined).success).toBe(true);
  });

  test('produces a JSON schema for OpenAPI generation', () => {
    const schema = mapAttribute(strapi, customFieldWithoutValues);

    expect(() => z.toJSONSchema(schema, { unrepresentable: 'any' })).not.toThrow();
  });
});

describe('enumeration custom field with enum values', () => {
  test('accepts only its enum values', () => {
    const attribute = {
      ...customFieldWithoutValues,
      enum: ['a', 'b'],
    } as unknown as Schema.Attribute.AnyAttribute;

    const schema = mapAttributeToInputSchema(strapi, attribute);

    expect(schema.safeParse('a').success).toBe(true);
    expect(schema.safeParse('c').success).toBe(false);
  });
});
