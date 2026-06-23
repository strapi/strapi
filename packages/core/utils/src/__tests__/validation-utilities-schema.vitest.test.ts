import { describe, it, expect } from 'vitest';

import * as z from 'zod/v4';
import {
  augmentSchema,
  maybeReadonly,
  maybeRequired,
  maybeWithDefault,
  maybeWithMinMax,
} from '../validation/utilities';

describe('validation utilities (schema modifiers)', () => {
  describe('maybeRequired', () => {
    it('makes schema optional by default', () => {
      const schema = maybeRequired()(z.string());
      expect(schema.safeParse(undefined).success).toBe(true);
    });

    it('keeps schema required when required is true', () => {
      const schema = maybeRequired(true)(z.string());
      expect(schema.safeParse(undefined).success).toBe(false);
    });
  });

  describe('maybeReadonly', () => {
    it('leaves schema writable by default', () => {
      const schema = maybeReadonly()(z.number());
      expect(schema.parse(1)).toBe(1);
    });

    it('makes schema readonly when writable is false', () => {
      const schema = maybeReadonly(false)(z.number());
      expect(() => {
        (schema.parse(1) as number) = 2;
      }).toThrow();
    });
  });

  describe('maybeWithDefault', () => {
    it('returns schema unchanged when default is undefined', () => {
      const schema = maybeWithDefault(undefined)(z.string());
      expect(schema.safeParse(undefined).success).toBe(false);
    });

    it('applies static default values', () => {
      const schema = maybeWithDefault('draft')(z.string());
      expect(schema.parse(undefined)).toBe('draft');
    });

    it('applies function default values', () => {
      const schema = maybeWithDefault(() => 42)(z.number());
      expect(schema.parse(undefined)).toBe(42);
    });
  });

  describe('maybeWithMinMax', () => {
    it('applies min and max when both provided', () => {
      const schema = maybeWithMinMax(2, 5)(z.string());
      expect(schema.safeParse('a').success).toBe(false);
      expect(schema.safeParse('abc').success).toBe(true);
      expect(schema.safeParse('abcdef').success).toBe(false);
    });

    it('returns schema unchanged when min or max missing', () => {
      const schema = maybeWithMinMax(undefined, 5)(z.string());
      expect(schema.safeParse('a').success).toBe(true);
    });
  });

  describe('augmentSchema', () => {
    it('applies modifiers in order', () => {
      const schema = augmentSchema(z.string(), [
        maybeRequired(false),
        maybeWithDefault('fallback'),
      ]);

      expect(schema.parse(undefined)).toBe('fallback');
    });
  });
});
