import { describe, it, expect } from 'vitest';

import BooleanField from '../boolean';

describe('BooleanField', () => {
  const field = new BooleanField({});

  describe('toDB', () => {
    it.each([
      [true, true],
      [false, false],
      [null, null],
      [undefined, null],
      ['true', true],
      ['t', true],
      ['1', true],
      [1, true],
      ['false', false],
      ['f', false],
      ['0', false],
      [0, false],
    ])('converts %p to %p', (input, expected) => {
      expect(field.toDB(input)).toBe(expected);
    });

    it('falls back to Boolean() for other values', () => {
      expect(field.toDB('yes')).toBe(true);
      expect(field.toDB('')).toBe(false);
    });
  });

  describe('fromDB', () => {
    it.each([
      [true, true],
      [false, false],
      ['1', true],
      ['0', false],
      [1, true],
      [0, false],
    ])('converts %p to %p', (input, expected) => {
      expect(field.fromDB(input)).toBe(expected);
    });

    it('returns null for unrecognized values', () => {
      expect(field.fromDB('true')).toBeNull();
      expect(field.fromDB(null)).toBeNull();
    });
  });
});
