import { describe, it, expect } from 'vitest';

import JSONField from '../json';

describe('JSONField', () => {
  const field = new JSONField({});

  describe('toDB', () => {
    it.each([
      [null, null],
      [undefined, null],
      [{ foo: 'bar' }, '{"foo":"bar"}'],
      [[1, 2], '[1,2]'],
      ['already-string', 'already-string'],
      [42, 42],
    ])('converts %p appropriately', (input, expected) => {
      expect(field.toDB(input)).toBe(expected);
    });
  });

  describe('fromDB', () => {
    it('parses JSON strings', () => {
      expect(field.fromDB('{"a":1}')).toEqual({ a: 1 });
      expect(field.fromDB('[1,2]')).toEqual([1, 2]);
    });

    it('parses doubly-stringified JSON from legacy Strapi versions', () => {
      expect(field.fromDB(JSON.stringify(JSON.stringify({ legacy: true })))).toEqual({
        legacy: true,
      });
    });

    it('returns invalid JSON strings unchanged', () => {
      expect(field.fromDB('{not json')).toBe('{not json');
    });

    it('returns non-string values unchanged', () => {
      expect(field.fromDB({ already: 'object' })).toEqual({ already: 'object' });
      expect(field.fromDB(null)).toBeNull();
    });
  });
});
