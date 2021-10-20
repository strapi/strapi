import addLocaleToLinksSearch from '../addLocaleToLinksSearch';

describe('i18n | middlewares | utils | addLocaleToLinksSearch', () => {
  it('should return an array', () => {
    expect(addLocaleToLinksSearch([])).toEqual([]);
  });

  it('should not modify the links when i18n is not enabled on a content type', () => {
    const links = [{ uid: 'test', destination: 'cm/collectionType/test' }];
    const schemas = [{ uid: 'test', pluginOptions: { i18n: { localized: false } } }];

    expect(addLocaleToLinksSearch(links, 'collectionType', schemas)).toEqual(links);
  });

  it('should set the isDisplayed key to false when the user does not have the permission to read or create a locale on a collection type', () => {
    const links = [
      { uid: 'foo', destination: 'cm/collectionType/foo', isDisplayed: true },
      { uid: 'bar', destination: 'cm/collectionType/bar', isDisplayed: true },
    ];
    const schemas = [
      { uid: 'foo', pluginOptions: { i18n: { localized: true } } },
      { uid: 'bar', pluginOptions: { i18n: { localized: true } } },
    ];
    const permissions = {
      foo: {
        'plugins::content-manager.explorer.create': [
          {
            properties: {
              fields: ['name'],
            },
          },
        ],
        'plugins::content-manager.explorer.read': [
          {
            properties: {
              fields: ['name'],
            },
          },
        ],
      },
      bar: {
        'plugins::content-manager.explorer.create': [
          {
            properties: {
              fields: ['name'],
              locales: [],
            },
          },
        ],
        'plugins::content-manager.explorer.read': [
          {
            properties: {
              fields: ['name'],
              locales: [],
            },
          },
        ],
      },
    };
    const expected = [
      { uid: 'foo', destination: 'cm/collectionType/foo', isDisplayed: false },
      { uid: 'bar', destination: 'cm/collectionType/bar', isDisplayed: false },
    ];
    const locales = [{ code: 'en', isDefault: true }, { code: 'fr' }];

    expect(addLocaleToLinksSearch(links, 'collectionType', schemas, locales, permissions)).toEqual(
      expected
    );
  });

  it('should add the locale to a link search', () => {
    const links = [
      { uid: 'foo', destination: 'cm/collectionType/foo', isDisplayed: true, search: 'page=1' },
      { uid: 'bar', destination: 'cm/collectionType/bar', isDisplayed: true },
    ];
    const schemas = [
      { uid: 'foo', pluginOptions: { i18n: { localized: true } } },
      { uid: 'bar', pluginOptions: { i18n: { localized: true } } },
    ];
    const permissions = {
      foo: {
        'plugins::content-manager.explorer.create': [
          {
            properties: {
              fields: ['name'],
              locales: ['fr'],
            },
          },
        ],
        'plugins::content-manager.explorer.read': [
          {
            properties: {
              fields: ['name'],
            },
          },
        ],
      },
      bar: {
        'plugins::content-manager.explorer.create': [
          {
            properties: {
              fields: ['name'],
              locales: ['fr'],
            },
          },
        ],
        'plugins::content-manager.explorer.read': [
          {
            properties: {
              fields: ['name'],
              locales: ['en'],
            },
          },
        ],
      },
    };
    const expected = [
      {
        uid: 'foo',
        destination: 'cm/collectionType/foo',
        isDisplayed: true,
        search: 'page=1&plugins[i18n][locale]=fr',
      },
      {
        uid: 'bar',
        destination: 'cm/collectionType/bar',
        isDisplayed: true,
        search: 'plugins[i18n][locale]=en',
      },
    ];
    const locales = [{ code: 'en', isDefault: true }, { code: 'fr' }];

    expect(addLocaleToLinksSearch(links, 'collectionType', schemas, locales, permissions)).toEqual(
      expected
    );
  });
});
