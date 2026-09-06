import { describe, it, expect } from 'vitest';

import { ValidationError } from '../errors';
import { asyncCurry, throwInvalidKey } from '../validate/utils';

describe('validate/utils', () => {
  describe('throwInvalidKey', () => {
    it('throws ValidationError with key only', () => {
      expect(() => throwInvalidKey({ key: 'filters' })).toThrow(ValidationError);
      expect(() => throwInvalidKey({ key: 'filters' })).toThrow('Invalid key filters');
    });

    it('throws ValidationError with key and path', () => {
      try {
        throwInvalidKey({ key: 'name', path: 'filters.name' });
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toBe('Invalid key name at filters.name');
        expect((error as ValidationError).details).toEqual({ key: 'name', path: 'filters.name' });
      }
    });
  });

  describe('asyncCurry', () => {
    const add = async (a: number, b: number, c: number) => a + b + c;

    it('curries async functions', async () => {
      const curried = asyncCurry(add);

      await expect(curried(1)(2)(3)).resolves.toBe(6);
      await expect(curried(1, 2)(3)).resolves.toBe(6);
      await expect(curried(1, 2, 3)).resolves.toBe(6);
    });
  });
});
