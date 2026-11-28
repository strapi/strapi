import { createYupSchema } from '../validation';

describe('createYupSchema biginteger attribute', () => {
  // `biginteger` values are stored as numeric strings. `min` / `max` must constrain the
  // numeric magnitude, not the string length, so a value with few digits can still be
  // rejected and a long one accepted.
  const schemaFor = (attribute: Record<string, unknown>) =>
    createYupSchema(
      { amount: { type: 'biginteger', ...attribute } } as never,
      {},
      {
        status: 'published',
      }
    );

  describe('min', () => {
    const schema = schemaFor({ min: '500' });

    test('accepts a value whose number is greater than min but whose length is shorter', () => {
      expect(schema.isValidSync({ amount: '3000' })).toBe(true);
    });

    test('rejects a value whose number is lower than min', () => {
      expect(schema.isValidSync({ amount: '100' })).toBe(false);
    });

    test('accepts a value equal to min', () => {
      expect(schema.isValidSync({ amount: '500' })).toBe(true);
    });
  });

  describe('max', () => {
    const schema = schemaFor({ max: '50' });

    test('rejects a value whose number is greater than max even if it has few digits', () => {
      expect(schema.isValidSync({ amount: '100' })).toBe(false);
    });

    test('accepts a value whose number is lower than max', () => {
      expect(schema.isValidSync({ amount: '40' })).toBe(true);
    });
  });

  test('compares values beyond the safe integer range', () => {
    // 9223372036854775807 is bigger than Number.MAX_SAFE_INTEGER, where Number() loses precision.
    const schema = schemaFor({ min: '9223372036854775806' });

    expect(schema.isValidSync({ amount: '9223372036854775807' })).toBe(true);
    expect(schema.isValidSync({ amount: '9223372036854775805' })).toBe(false);
  });
});
