import { describe, it, expect } from 'vitest';

import { isOperator, isOperatorOfType } from '../operators';

describe('operators', () => {
  describe('isOperatorOfType', () => {
    it.each([
      ['where', '$eq', true],
      ['where', '$EQ', false],
      ['where', '$eq', true, false],
      ['where', '$EQ', true, true],
      ['cast', '$between', true],
      ['group', '$and', true],
      ['array', '$in', true],
      ['where', '$unknown', false],
      ['unknownType', '$eq', false],
    ])(
      'isOperatorOfType(%s, %s, ignoreCase=%s) => %s',
      (type, key, expected, ignoreCase = false) => {
        expect(isOperatorOfType(type, key, ignoreCase)).toBe(expected);
      }
    );
  });

  describe('isOperator', () => {
    it.each([
      ['$eq', true],
      ['$and', true],
      ['$in', true],
      ['title', false],
      ['$unknown', false],
    ])('isOperator(%s) => %s', (key, expected) => {
      expect(isOperator(key)).toBe(expected);
    });

    it('isOperator ignores case when requested', () => {
      expect(isOperator('$EQ', true)).toBe(true);
      expect(isOperator('$EQ', false)).toBe(false);
    });
  });
});
