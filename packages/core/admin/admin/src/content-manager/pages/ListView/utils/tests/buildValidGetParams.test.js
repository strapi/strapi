import { buildValidGetParams } from '../index';

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

    const params = buildValidGetParams(queryParams);

    const expectedParams = {
      page: '1',
      pageSize: '10',
      sort: 'name:ASC',
      locale: 'en',
    };

    expect(params).toStrictEqual(expectedParams);
  });

  it('should encode a search query', () => {
    const _q = `test&query`;
    const queryParams = {
      page: '1',
      pageSize: '10',
      sort: 'name:ASC',
      _q,
    };

    const params = buildValidGetParams(queryParams);
    const expectedParams = {
      page: '1',
      pageSize: '10',
      sort: 'name:ASC',
      _q: encodeURIComponent(_q),
    };

    expect(params).toStrictEqual(expectedParams);
  });
});
