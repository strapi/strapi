import getInitialLocale from '../getInitialLocale';

describe('getInitialLocale', () => {
  it('gives "fr-FR" when the query.pluginOptions.locale is "fr-FR"', () => {
    const query = {
      query: {
        page: '1',
        pageSize: '10',
        _sort: 'Name:ASC',
        pluginOptions: {
          locale: 'fr-FR',
        },
      },
      rawQuery: '?page=1&pageSize=10&_sort=Name:ASC&pluginOptions[locale]=fr-FR',
    };

    const locales = [
      {
        id: 1,
        name: 'English',
        code: 'en',
        created_at: '2021-03-09T14:57:03.016Z',
        updated_at: '2021-03-09T14:57:03.016Z',
        isDefault: true,
      },
      {
        id: 2,
        name: 'French (France) (fr-FR)',
        code: 'fr-FR',
        created_at: '2021-03-09T15:03:06.992Z',
        updated_at: '2021-03-09T15:03:06.996Z',
        isDefault: false,
      },
    ];

    const expected = {
      id: 2,
      name: 'French (France) (fr-FR)',
      code: 'fr-FR',
      created_at: '2021-03-09T15:03:06.992Z',
      updated_at: '2021-03-09T15:03:06.996Z',
      isDefault: false,
    };
    const actual = getInitialLocale(query, locales);

    expect(actual).toEqual(expected);
  });

  it('gives the default locale ("en") when there s no locale in the query', () => {
    const query = {
      query: {
        page: '1',
        pageSize: '10',
        _sort: 'Name:ASC',
        pluginOptions: {
          something: 'great',
        },
      },
      rawQuery: '?page=1&pageSize=10&_sort=Name:ASC&pluginOptions[something]=great',
    };

    const locales = [
      {
        id: 1,
        name: 'English',
        code: 'en',
        created_at: '2021-03-09T14:57:03.016Z',
        updated_at: '2021-03-09T14:57:03.016Z',
        isDefault: true,
      },
      {
        id: 2,
        name: 'French (France) (fr-FR)',
        code: 'fr-FR',
        created_at: '2021-03-09T15:03:06.992Z',
        updated_at: '2021-03-09T15:03:06.996Z',
        isDefault: false,
      },
    ];

    const expected = {
      id: 1,
      name: 'English',
      code: 'en',
      created_at: '2021-03-09T14:57:03.016Z',
      updated_at: '2021-03-09T14:57:03.016Z',
      isDefault: true,
    };

    const actual = getInitialLocale(query, locales);

    expect(actual).toEqual(expected);
  });

  it('gives "undefined" when theres no locale. IMPORTANT: such case should not exist since at least one locale is created on the backend when plug-in i18n', () => {
    const query = {
      query: {
        page: '1',
        pageSize: '10',
        _sort: 'Name:ASC',
        pluginOptions: {
          something: 'great',
        },
      },
      rawQuery: '?page=1&pageSize=10&_sort=Name:ASC&pluginOptions[something]=great',
    };

    const locales = [];

    const expected = undefined;
    const actual = getInitialLocale(query, locales);

    expect(actual).toEqual(expected);
  });
});
