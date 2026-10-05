import { describe, it, expect } from 'vitest';

import StringField from '../string';

describe('StringField', () => {
  const field = new StringField({});

  describe('toDB', () => {
    it.each([
      ['hello', 'hello'],
      [123, '123'],
      [true, 'true'],
      [null, ''],
      [undefined, ''],
    ])('converts %p to %p', (input, expected) => {
      expect(field.toDB(input)).toBe(expected);
    });
  });

  describe('fromDB', () => {
    it.each([
      ['hello', 'hello'],
      [42, '42'],
      [null, ''],
    ])('converts %p to %p', (input, expected) => {
      expect(field.fromDB(input)).toBe(expected);
    });
  });
});
