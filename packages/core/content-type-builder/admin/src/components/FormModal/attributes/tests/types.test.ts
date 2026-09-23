import { ValidationError } from 'yup';

import { attributeTypes } from '../types';

const validateEnum = async (enumValues: string[]) => {
  try {
    await attributeTypes.enumeration([], []).validate({
      name: 'category',
      type: 'enumeration',
      enum: enumValues,
    });

    return undefined;
  } catch (err) {
    return (err as ValidationError).message;
  }
};

describe('attributeTypes.enumeration', () => {
  it('accepts a non-empty list of values', async () => {
    await expect(validateEnum(['one', 'two'])).resolves.toBeUndefined();
  });

  /**
   * The generic `components.Input.error.validation.min` message interpolates `{min}`, but CTB
   * renders field errors as `formatMessage({ id: error })` without any values, so it used to leak
   * the raw `(min: {min})` placeholder. See strapi/strapi#19030.
   */
  it('reports an empty enumeration with a message that needs no interpolation', async () => {
    const message = await validateEnum([]);

    expect(message).toBe('content-type-builder.error.validation.enum-empty');
    expect(message).not.toContain('{min}');
  });
});
