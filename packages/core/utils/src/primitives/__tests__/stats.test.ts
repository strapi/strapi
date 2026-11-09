import { arithmeticMean, percentileNearestSorted } from '../stats';

describe('stats primitives', () => {
  describe('percentileNearestSorted', () => {
    it('returns null for an empty array', () => {
      expect(percentileNearestSorted([], 50)).toBeNull();
    });

    it('returns the only element for any percentile', () => {
      expect(percentileNearestSorted([42], 0)).toBe(42);
      expect(percentileNearestSorted([42], 50)).toBe(42);
      expect(percentileNearestSorted([42], 100)).toBe(42);
    });

    it('matches nearest-rank p50 on sorted data', () => {
      const sorted = [10, 20, 30, 40, 100];
      expect(percentileNearestSorted(sorted, 50)).toBe(30);
      expect(percentileNearestSorted(sorted, 95)).toBe(100);
    });
  });

  describe('arithmeticMean', () => {
    it('returns null for an empty array', () => {
      expect(arithmeticMean([])).toBeNull();
    });

    it('averages values', () => {
      expect(arithmeticMean([2, 4, 6])).toBe(4);
    });
  });
});
