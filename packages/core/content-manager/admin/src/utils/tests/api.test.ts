import { buildValidParams } from '../api';

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

      expect(params).toMatchInlineSnapshot(`
        {
          "locale": "en",
          "page": "1",
          "pageSize": "10",
          "sort": "name:ASC",
        }
      `);
    });
  });
});
