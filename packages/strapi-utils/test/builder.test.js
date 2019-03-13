const { Builder, getFilterKey, getOperatorKey } = require('../lib/builder');

describe('Builder', () => {
  describe('getFilterKey', () => {
    test('Parses sort key', () => {
      expect(getFilterKey('_sort')).toBe('sort');
      expect(getFilterKey('sort')).toBe('sort');
      expect(getFilterKey('_sort_invalid')).toBe(null);
    });

    test('Parses limit key', () => {
      expect(getFilterKey('_limit')).toBe('limit');
      expect(getFilterKey('limit')).toBe('limit');
      expect(getFilterKey('_limit_invalid')).toBe(null);
    });

    test('Parses start key', () => {
      expect(getFilterKey('_start')).toBe('start');
      expect(getFilterKey('start')).toBe('start');
      expect(getFilterKey('_start_invalid')).toBe(null);
    });

    test('Parses skip key', () => {
      expect(getFilterKey('_skip')).toBe('skip');
      expect(getFilterKey('skip')).toBe('skip');
      expect(getFilterKey('_skip_invalid')).toBe(null);
    });
  });

  describe('getOperatorKey', () => {
    test('Defaults to equal', () => {
      expect(getOperatorKey('firstName')).toEqual(['firstName', 'eq']);
      expect(getOperatorKey('published_at')).toEqual(['published_at', 'eq']);
    });

    test('Parses not equal', () => {
      expect(getOperatorKey('firstName_neq')).toEqual(['firstName', 'neq']);
      expect(getOperatorKey('firstName_lte_neq')).toEqual(['firstName_lte', 'neq']);
    });

    test('Parses not less than', () => {
      expect(getOperatorKey('firstName_lt')).toEqual(['firstName', 'lt']);
    });

    test('Parses not less than or equal', () => {
      expect(getOperatorKey('firstName_lte')).toEqual(['firstName', 'lte']);
    });

    test('Parses not greater than', () => {
      expect(getOperatorKey('firstName_gt')).toEqual(['firstName', 'gt']);
    });

    test('Parses not greater than or equal', () => {
      expect(getOperatorKey('firstName_gte')).toEqual(['firstName', 'gte']);
    });

    test('Parses in', () => {
      expect(getOperatorKey('firstName_in')).toEqual(['firstName', 'in']);
    });

    test('Parses not in', () => {
      expect(getOperatorKey('firstName_nin')).toEqual(['firstName', 'nin']);
    });

    test('Parses contains', () => {
      expect(getOperatorKey('firstName_contains')).toEqual(['firstName', 'contains']);
    });

    test('Parses contains case sensitive', () => {
      expect(getOperatorKey('firstName_containss')).toEqual(['firstName', 'containss']);
    });
  });
});
