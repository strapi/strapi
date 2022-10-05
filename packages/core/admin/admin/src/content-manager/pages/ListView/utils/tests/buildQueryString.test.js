import buildQueryString from '../buildQueryString';

describe('buildQueryString', () => {
  it('creates a valid query string with default params', () => {
    const queryParams = {
      page: '1',
      pageSize: '10',
      sort: 'name:ASC',
    };

    const queryString = buildQueryString(queryParams);

    expect(queryString).toBe('?page=1&pageSize=10&sort=name:ASC');
  });

  it('creates a valid query string with default params & plugin options', () => {
    const queryParams = {
      page: '1',
      pageSize: '10',
      sort: 'name:ASC',
      plugins: {
        i18n: { locale: 'en' },
      },
    };

    const queryString = buildQueryString(queryParams);

    expect(queryString).toBe('?page=1&pageSize=10&sort=name:ASC&locale=en');
  });

  it('creates a valid query string with a filters clause', () => {
    const queryParams = {
      page: '1',
      pageSize: '10',
      sort: 'name:ASC',
      filters: [{ name: 'hello world' }],
    };

    const queryString = buildQueryString(queryParams);

    expect(queryString).toBe('?page=1&pageSize=10&sort=name:ASC&filters[0][name]=hello world');
  });

  it('creates a valid query string with a filters and plugin options', () => {
    const queryParams = {
      page: '1',
      pageSize: '10',
      sort: 'name:ASC',
      filters: [{ name: 'hello world' }],
      plugins: {
        i18n: { locale: 'en' },
      },
    };

    const queryString = buildQueryString(queryParams);

    expect(queryString).toBe(
      '?page=1&pageSize=10&sort=name:ASC&filters[0][name]=hello world&locale=en'
    );
  });

  it('creates a valid query string with a search query', () => {
    const _q = `test&query`;
    const queryParams = {
      page: '1',
      pageSize: '10',
      sort: 'name:ASC',
      _q,
    };

    const queryString = buildQueryString(queryParams);

    expect(queryString).toBe(`?page=1&pageSize=10&sort=name:ASC&_q=${encodeURIComponent(_q)}`);
  });
});
