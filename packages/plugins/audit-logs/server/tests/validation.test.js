'use strict';

const {
  validatePagination,
  validateSort,
  validateFilters,
  validateId,
} = require('../src/utils/validation');

describe('Validation Utility', () => {
  describe('validatePagination', () => {
    it('should return default values when no params provided', () => {
      const result = validatePagination({});
      expect(result).toEqual({ page: 1, pageSize: 25 });
    });

    it('should parse valid pagination params', () => {
      const result = validatePagination({ page: '2', pageSize: '50' });
      expect(result).toEqual({ page: 2, pageSize: 50 });
    });

    it('should throw error for invalid page number', () => {
      expect(() => validatePagination({ page: '0' })).toThrow('Invalid page number');
      expect(() => validatePagination({ page: '-1' })).toThrow('Invalid page number');
      expect(() => validatePagination({ page: 'invalid' })).toThrow('Invalid page number');
    });

    it('should throw error for invalid pageSize', () => {
      expect(() => validatePagination({ pageSize: '0' })).toThrow('Invalid pageSize');
      expect(() => validatePagination({ pageSize: '101' })).toThrow('Invalid pageSize');
      expect(() => validatePagination({ pageSize: 'invalid' })).toThrow('Invalid pageSize');
    });

    it('should accept pageSize at max limit', () => {
      const result = validatePagination({ pageSize: '100' });
      expect(result.pageSize).toBe(100);
    });
  });

  describe('validateSort', () => {
    it('should return default values when no params provided', () => {
      const result = validateSort({});
      expect(result).toEqual({ field: 'timestamp', order: 'desc' });
    });

    it('should parse valid sort params', () => {
      const result = validateSort({ sortBy: 'action', sortOrder: 'asc' });
      expect(result).toEqual({ field: 'action', order: 'asc' });
    });

    it('should throw error for invalid sortBy field', () => {
      expect(() => validateSort({ sortBy: 'invalidField' })).toThrow('Invalid sortBy field');
    });

    it('should throw error for invalid sortOrder', () => {
      expect(() => validateSort({ sortOrder: 'invalid' })).toThrow('Invalid sortOrder');
    });

    it('should accept all valid sort fields', () => {
      const validFields = ['timestamp', 'contentType', 'action', 'userId', 'recordId'];
      validFields.forEach((field) => {
        const result = validateSort({ sortBy: field });
        expect(result.field).toBe(field);
      });
    });
  });

  describe('validateFilters', () => {
    it('should return empty object when no filters provided', () => {
      const result = validateFilters({});
      expect(result).toEqual({});
    });

    it('should parse valid action filter', () => {
      const result = validateFilters({ action: 'create' });
      expect(result).toEqual({ action: 'create' });
    });

    it('should throw error for invalid action', () => {
      expect(() => validateFilters({ action: 'invalid' })).toThrow('Invalid action');
    });

    it('should accept all valid actions', () => {
      ['create', 'update', 'delete'].forEach((action) => {
        const result = validateFilters({ action });
        expect(result.action).toBe(action);
      });
    });

    it('should parse valid userId filter', () => {
      const result = validateFilters({ userId: '123' });
      expect(result).toEqual({ userId: 123 });
    });

    it('should throw error for invalid userId', () => {
      expect(() => validateFilters({ userId: 'invalid' })).toThrow('Invalid userId');
    });

    it('should parse valid date filters', () => {
      const dateFrom = '2025-01-01T00:00:00Z';
      const dateTo = '2025-12-31T23:59:59Z';
      const result = validateFilters({ dateFrom, dateTo });
      expect(result).toEqual({ dateFrom, dateTo });
    });

    it('should throw error for invalid dateFrom', () => {
      expect(() => validateFilters({ dateFrom: 'invalid-date' })).toThrow(
        'Invalid dateFrom'
      );
    });

    it('should throw error for invalid dateTo', () => {
      expect(() => validateFilters({ dateTo: 'invalid-date' })).toThrow('Invalid dateTo');
    });

    it('should throw error when dateFrom is after dateTo', () => {
      expect(() =>
        validateFilters({
          dateFrom: '2025-12-31T00:00:00Z',
          dateTo: '2025-01-01T00:00:00Z',
        })
      ).toThrow('dateFrom must be before dateTo');
    });

    it('should accept contentType and recordId as strings', () => {
      const result = validateFilters({
        contentType: 'api::article.article',
        recordId: 'abc123',
      });
      expect(result).toEqual({
        contentType: 'api::article.article',
        recordId: 'abc123',
      });
    });

    it('should parse multiple filters together', () => {
      const result = validateFilters({
        action: 'update',
        userId: '5',
        contentType: 'api::article.article',
        dateFrom: '2025-01-01T00:00:00Z',
      });
      expect(result).toEqual({
        action: 'update',
        userId: 5,
        contentType: 'api::article.article',
        dateFrom: '2025-01-01T00:00:00Z',
      });
    });
  });

  describe('validateId', () => {
    it('should accept valid numeric ID strings', () => {
      expect(() => validateId('1')).not.toThrow();
      expect(() => validateId('123')).not.toThrow();
      expect(() => validateId('999999')).not.toThrow();
    });

    it('should throw error for invalid IDs', () => {
      expect(() => validateId('')).toThrow('Invalid ID parameter');
      expect(() => validateId(null)).toThrow('Invalid ID parameter');
      expect(() => validateId(undefined)).toThrow('Invalid ID parameter');
      expect(() => validateId(123)).toThrow('Invalid ID parameter'); // Must be string
    });

    it('should throw error for non-numeric IDs', () => {
      expect(() => validateId('abc')).toThrow('ID must be a positive number');
      expect(() => validateId('0')).toThrow('ID must be a positive number');
      expect(() => validateId('-1')).toThrow('ID must be a positive number');
    });
  });
});
