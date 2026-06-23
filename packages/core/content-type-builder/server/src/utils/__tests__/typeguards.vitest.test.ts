import { describe, it, expect } from 'vitest';

import { hasDefaultAttribute } from '../typeguards';

describe('typeguards', () => {
  describe('hasDefaultAttribute', () => {
    it('returns true when default is present', () => {
      expect(hasDefaultAttribute({ type: 'string', default: 'hello' })).toBe(true);
    });

    it('returns false when default is absent', () => {
      expect(hasDefaultAttribute({ type: 'string' })).toBe(false);
    });

    it('returns true when default is explicitly null', () => {
      expect(hasDefaultAttribute({ type: 'string', default: null })).toBe(true);
    });
  });
});
