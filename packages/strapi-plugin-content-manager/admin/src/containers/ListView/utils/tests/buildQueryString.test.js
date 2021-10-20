import buildQueryString from '../buildQueryString';

describe('buildQueryString', () => {
  it('creates a valid query string with default params', () => {
    const queryParams = {
      page: '1',
      pageSize: '10',
      _sort: 'name:ASC',
    };

    const queryString = buildQueryString(queryParams);

    expect(queryString).toBe('?page=1&pageSize=10&_sort=name:ASC');
  });

  it('creates a valid query string with default params & plugin options', () => {
    const queryParams = {
      page: '1',
      pageSize: '10',
      _sort: 'name:ASC',
      plugins: {
        i18n: { locale: 'en' },
      },
    };

    const queryString = buildQueryString(queryParams);

    expect(queryString).toBe('?page=1&pageSize=10&_sort=name:ASC&_locale=en');
  });

  it('creates a valid query string with a _where clause', () => {
    const queryParams = {
      page: '1',
      pageSize: '10',
      _sort: 'name:ASC',
      _where: [{ name: 'hello world' }],
    };

    const queryString = buildQueryString(queryParams);

    expect(queryString).toBe('?page=1&pageSize=10&_sort=name:ASC&_where[0][name]=hello world');
  });

  it('creates a valid query string with a _where and plugin options', () => {
    const queryParams = {
      page: '1',
      pageSize: '10',
      _sort: 'name:ASC',
      _where: [{ name: 'hello world' }],
      plugins: {
        i18n: { locale: 'en' },
      },
    };

    const queryString = buildQueryString(queryParams);

    expect(queryString).toBe(
      '?page=1&pageSize=10&_sort=name:ASC&_where[0][name]=hello world&_locale=en'
    );
  });
});
