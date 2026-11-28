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
      const schema = maybeReadonly(false)(z.object({ count: z.number() }));
      const result = schema.parse({ count: 1 });

      expect(Object.isFrozen(result)).toBe(true);
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

    it('applies min when only min is provided', () => {
      const schema = maybeWithMinMax(2, undefined)(z.string());
      expect(schema.safeParse('a').success).toBe(false);
      expect(schema.safeParse('abcdefghij').success).toBe(true);
    });

    it('applies max when only max is provided', () => {
      const schema = maybeWithMinMax(undefined, 5)(z.number());
      expect(schema.safeParse(5).success).toBe(true);
      expect(schema.safeParse(6).success).toBe(false);
    });

    it('returns schema unchanged when neither min nor max is provided', () => {
      const schema = maybeWithMinMax(undefined, undefined)(z.array(z.any()));
      expect(schema.safeParse([]).success).toBe(true);
      expect(schema.safeParse(Array.from({ length: 100 })).success).toBe(true);
    });

    it('treats a null min or max as not provided', () => {
      const schema = maybeWithMinMax(null as unknown as number, 5)(z.number());
      expect(schema.safeParse(-100).success).toBe(true);
      expect(schema.safeParse(6).success).toBe(false);
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
