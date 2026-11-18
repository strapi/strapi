import { describe, it, expect } from 'vitest';
import type { Schema } from '@strapi/types';

import { getTypeValidator } from '../types';

const validate = (attribute: Record<string, unknown>) =>
  getTypeValidator(attribute as unknown as Schema.Attribute.AnyAttribute, {
    types: ['enumeration'],
    attributes: {},
  }).validate(attribute, { abortEarly: false });

describe('enumeration type validator', () => {
  it('accepts an enumeration whose default is one of its values', async () => {
    const attribute = { type: 'enumeration', enum: ['a', 'b'], default: 'a' };

    await expect(validate(attribute)).resolves.toEqual(attribute);
  });

  it('rejects a default that is not one of the values', async () => {
    await expect(validate({ type: 'enumeration', enum: ['a', 'b'], default: 'c' })).rejects.toThrow(
      'default must be one of the following values: a, b'
    );
  });

  it.each([
    ['missing', { type: 'enumeration' }],
    ['missing, with a default', { type: 'enumeration', default: 'a' }],
    ['null', { type: 'enumeration', enum: null }],
    ['not an array', { type: 'enumeration', enum: 'a', default: 'a' }],
  ])('rejects with a validation error when enum is %s', async (_, attribute) => {
    await expect(validate(attribute)).rejects.toMatchObject({
      name: 'ValidationError',
      inner: expect.arrayContaining([expect.objectContaining({ path: 'enum' })]),
    });
  });
});
