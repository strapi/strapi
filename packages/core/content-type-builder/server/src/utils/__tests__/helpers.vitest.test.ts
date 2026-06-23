import { describe, it, expect } from 'vitest';

import { escapeNewlines, deepTrimObject } from '../helpers';

describe('CTB helpers', () => {
  describe('escapeNewlines', () => {
    it('replaces newlines with placeholder', () => {
      expect(escapeNewlines('line1\nline2\r\nline3')).toBe('line1\nline2\nline3');
    });

    it('uses custom placeholder', () => {
      expect(escapeNewlines('a\nb', ' | ')).toBe('a | b');
    });

    it('returns empty string for undefined', () => {
      expect(escapeNewlines()).toBe('');
    });
  });

  describe('deepTrimObject', () => {
    it('trims string values', () => {
      expect(deepTrimObject('  hello  ')).toBe('hello');
    });

    it('trims nested objects and arrays', () => {
      const input = {
        name: '  Article  ',
        tags: ['  a ', ' b  '],
        meta: { title: '  Hi  ' },
      };

      expect(deepTrimObject(input)).toEqual({
        name: 'Article',
        tags: ['a', 'b'],
        meta: { title: 'Hi' },
      });
    });

    it('leaves non-string primitives unchanged', () => {
      expect(deepTrimObject(42)).toBe(42);
    });

    it('throws when given null (typeof null is object)', () => {
      expect(() => deepTrimObject(null as unknown as string)).toThrow();
    });
  });
});
