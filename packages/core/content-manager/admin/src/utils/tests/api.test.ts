import { buildValidParams, extractStatusFilter } from '../api';

describe('api', () => {
  describe('buildValidQueryParams', () => {
    it('should format query params from plugins', () => {
      const queryParams = {
        page: '1',
        pageSize: '10',
        sort: 'name:ASC',
        plugins: {
          i18n: { locale: 'en' },
        },
      };

      const params = buildValidParams(queryParams);

      expect(params).toEqual({
        locale: 'en',
        page: '1',
        pageSize: '10',
        sort: 'name:ASC',
      });
    });
  });

  describe('extractStatusFilter', () => {
    it('should return params unchanged when there are no filters', () => {
      const queryParams = { page: 1 };

      const params = extractStatusFilter(queryParams);

      expect(params).toEqual({ page: 1 });
    });

    it('should return params unchanged when filters.$and is missing', () => {
      const queryParams = { filters: { name: 'test' } };
      const params = extractStatusFilter(queryParams);

      expect(params).toEqual({ filters: { name: 'test' } });
    });

    it('should return params unchanged when filters.$and is not an array', () => {
      const queryParams = { filters: { $and: 'invalid' } };
      const params = extractStatusFilter(queryParams);

      expect(params).toEqual({ filters: { $and: 'invalid' } });
    });

    it('should return params unchanged when no __status filters exist in $and', () => {
      const queryParams = { filters: { $and: [{ name: { $eq: 'test' } }] } };
      const params = extractStatusFilter(queryParams);

      expect(params).toEqual({
        filters: { $and: [{ name: { $eq: 'test' } }] },
      });
    });

    it('should extract published status as a top-level status param', () => {
      const queryParams = { filters: { $and: [{ __status: { $eq: 'published' } }] } };
      const params = extractStatusFilter(queryParams);

      expect(params).toEqual({
        filters: undefined,
        status: 'published',
      });
    });

    it('should extract draft status as a top-level hasPublishedVersion param', () => {
      const queryParams = { filters: { $and: [{ __status: { $eq: 'draft' } }] } };
      const params = extractStatusFilter(queryParams);

      expect(params).toEqual({
        hasPublishedVersion: 'false',
        filters: undefined,
      });
    });

    it('should preserve non-status filters in $and', () => {
      const queryParams = {
        filters: {
          $and: [{ name: { $eq: 'test' } }, { __status: { $eq: 'published' } }],
        },
      };
      const params = extractStatusFilter(queryParams);

      expect(params).toEqual({
        filters: { $and: [{ name: { $eq: 'test' } }] },
        status: 'published',
      });
    });

    it('should handle multiple status filters', () => {
      const queryParams = {
        filters: {
          $and: [{ __status: { $eq: 'published' } }, { __status: { $eq: 'draft' } }],
        },
      };
      const params = extractStatusFilter(queryParams);

      expect(params).toEqual({
        hasPublishedVersion: 'false',
        status: 'published',
        filters: undefined,
      });
    });
  });
});
