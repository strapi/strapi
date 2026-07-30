import { buildValidParams } from '../api';

describe('api', () => {
  describe('buildValidParams', () => {
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

    it('should pass through filters including __status (server rewrites them)', () => {
      const queryParams = {
        filters: { $and: [{ __status: { $eq: 'draft' } }] },
        page: '1',
      };
      const params = buildValidParams(queryParams);

      expect(params).toEqual({
        filters: { $and: [{ __status: { $eq: 'draft' } }] },
        page: '1',
      });
    });
  });
});
