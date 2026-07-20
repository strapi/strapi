import { buildValidParams } from '../api';

describe('api', () => {
  describe('buildValidParams', () => {
    it('should flatten plugin query parameters', () => {
      const params = buildValidParams({
        page: '1',
        plugins: {
          i18n: { locale: 'en' },
        },
      });

      expect(params).toEqual({
        locale: 'en',
        page: '1',
      });
    });
  });
});
