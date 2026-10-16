import type { Core, Schema } from '@strapi/types';

import { mapAttributeToInputSchema, mapAttributeToSchema } from '../mappers';

const CUSTOM_FIELD_UID = 'plugin::test.deferred';
const customFieldAttribute = {
  type: 'customField',
  customField: CUSTOM_FIELD_UID,
} as unknown as Schema.Attribute.AnyAttribute;

describe('custom field route validation', () => {
  const createStrapi = () => {
    const registeredCustomFields = new Map<string, { type: string }>();
    const customFields = {
      get: jest.fn((uid: string) => {
        const customField = registeredCustomFields.get(uid);

        if (!customField) {
          throw new Error(`Could not find Custom Field: ${uid}`);
        }

        return customField;
      }),
    };
    const strapi = {
      get: jest.fn((key: string) => {
        if (key === 'custom-fields') {
          return customFields;
        }

        throw new Error(`Unexpected registry: ${key}`);
      }),
    } as unknown as Core.Strapi;

    return { strapi, registeredCustomFields };
  };

  it.each([
    ['output', mapAttributeToSchema],
    ['input', mapAttributeToInputSchema],
  ])('defers %s custom field resolution until validation', (_kind, mapper) => {
    const { strapi, registeredCustomFields } = createStrapi();

    const schema = mapper(strapi, customFieldAttribute);

    registeredCustomFields.set(CUSTOM_FIELD_UID, { type: 'string' });

    expect(schema.parse('value')).toBe('value');
    expect(schema.safeParse(123).success).toBe(false);
  });
});
