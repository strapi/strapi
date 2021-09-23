import getDefaultLocale from '../getDefaultLocale';

describe('getDefaultLocale', () => {
  it('gives fr-FR when it s the default locale and that it has read access to it', () => {
    const locales = [
      {
        id: 1,
        name: 'English',
        code: 'en',
        createdAt: '2021-03-09T14:57:03.016Z',
        updatedAt: '2021-03-09T14:57:03.016Z',
        isDefault: false,
      },
      {
        id: 2,
        name: 'French (France) (fr-FR)',
        code: 'fr-FR',
        createdAt: '2021-03-09T15:03:06.992Z',
        updatedAt: '2021-03-17T13:01:03.569Z',
        isDefault: true,
      },
    ];

    const ctPermissions = {
      'plugin::content-manager.explorer.create': [
        {
          id: 1325,
          action: 'plugin::content-manager.explorer.create',
          subject: 'api::address.address',
          properties: {
            fields: [
              'postal_coder',
              'categories',
              'cover',
              'images',
              'city',
              'likes',
              'json',
              'slug',
            ],
            locales: [],
          },
          conditions: [],
        },
      ],
      'plugin::content-manager.explorer.read': [
        {
          id: 1326,
          action: 'plugin::content-manager.explorer.read',
          subject: 'api::address.address',
          properties: {
            fields: [],
            locales: ['en', 'fr-FR'],
          },
          conditions: [],
        },
      ],
    };

    const expected = 'fr-FR';
    const actual = getDefaultLocale(ctPermissions, locales);

    expect(actual).toEqual(expected);
  });

  it('gives fr-FR when it s the default locale and that it has create access to it', () => {
    const locales = [
      {
        id: 1,
        name: 'English',
        code: 'en',
        createdAt: '2021-03-09T14:57:03.016Z',
        updatedAt: '2021-03-09T14:57:03.016Z',
        isDefault: false,
      },
      {
        id: 2,
        name: 'French (France) (fr-FR)',
        code: 'fr-FR',
        createdAt: '2021-03-09T15:03:06.992Z',
        updatedAt: '2021-03-17T13:01:03.569Z',
        isDefault: true,
      },
    ];

    const ctPermissions = {
      'plugin::content-manager.explorer.create': [
        {
          id: 1325,
          action: 'plugin::content-manager.explorer.create',
          subject: 'api::address.address',
          properties: {
            fields: [
              'postal_coder',
              'categories',
              'cover',
              'images',
              'city',
              'likes',
              'json',
              'slug',
            ],
            locales: ['fr-FR'],
          },
          conditions: [],
        },
      ],
      'plugin::content-manager.explorer.read': [
        {
          id: 1326,
          action: 'plugin::content-manager.explorer.read',
          subject: 'api::address.address',
          properties: {
            fields: [],
            locales: ['en'],
          },
          conditions: [],
        },
      ],
    };

    const expected = 'fr-FR';
    const actual = getDefaultLocale(ctPermissions, locales);

    expect(actual).toEqual(expected);
  });

  it('gives gives the first locale with read permission ("en") when the locale is allowed', () => {
    const locales = [
      {
        id: 1,
        name: 'English',
        code: 'en',
        createdAt: '2021-03-09T14:57:03.016Z',
        updatedAt: '2021-03-09T14:57:03.016Z',
        isDefault: false,
      },
      {
        id: 2,
        name: 'French (France) (fr-FR)',
        code: 'fr-FR',
        createdAt: '2021-03-09T15:03:06.992Z',
        updatedAt: '2021-03-17T13:01:03.569Z',
        isDefault: true,
      },
      {
        id: 3,
        name: 'Another lang',
        code: 'de',
        createdAt: '2021-03-09T15:03:06.992Z',
        updatedAt: '2021-03-17T13:01:03.569Z',
        isDefault: false,
      },
    ];

    const ctPermissions = {
      'plugin::content-manager.explorer.create': [
        {
          id: 1325,
          action: 'plugin::content-manager.explorer.create',
          subject: 'api::address.address',
          properties: {
            fields: [
              'postal_coder',
              'categories',
              'cover',
              'images',
              'city',
              'likes',
              'json',
              'slug',
            ],
            locales: [],
          },
          conditions: [],
        },
      ],
      'plugin::content-manager.explorer.read': [
        {
          id: 1326,
          action: 'plugin::content-manager.explorer.read',
          subject: 'api::address.address',
          properties: {
            fields: [],
            locales: ['en', 'de'],
          },
          conditions: [],
        },
      ],
    };

    const expected = 'en';
    const actual = getDefaultLocale(ctPermissions, locales);

    expect(actual).toEqual(expected);
  });

  it('gives gives the first locale with create permission ("en") when the locale is allowed', () => {
    const locales = [
      {
        id: 1,
        name: 'English',
        code: 'en',
        createdAt: '2021-03-09T14:57:03.016Z',
        updatedAt: '2021-03-09T14:57:03.016Z',
        isDefault: false,
      },
      {
        id: 2,
        name: 'French (France) (fr-FR)',
        code: 'fr-FR',
        createdAt: '2021-03-09T15:03:06.992Z',
        updatedAt: '2021-03-17T13:01:03.569Z',
        isDefault: true,
      },
      {
        id: 3,
        name: 'Another lang',
        code: 'de',
        createdAt: '2021-03-09T15:03:06.992Z',
        updatedAt: '2021-03-17T13:01:03.569Z',
        isDefault: false,
      },
    ];

    const ctPermissions = {
      'plugin::content-manager.explorer.create': [
        {
          id: 1325,
          action: 'plugin::content-manager.explorer.create',
          subject: 'api::address.address',
          properties: {
            fields: [
              'postal_coder',
              'categories',
              'cover',
              'images',
              'city',
              'likes',
              'json',
              'slug',
            ],
            locales: ['en', 'de'],
          },
          conditions: [],
        },
      ],
      'plugin::content-manager.explorer.read': [
        {
          id: 1326,
          action: 'plugin::content-manager.explorer.read',
          subject: 'api::address.address',
          properties: {
            fields: [],
            locales: [],
          },
          conditions: [],
        },
      ],
    };

    const expected = 'en';
    const actual = getDefaultLocale(ctPermissions, locales);

    expect(actual).toEqual(expected);
  });

  it('gives null when the user has no permission on any locale', () => {
    const locales = [
      {
        id: 1,
        name: 'English',
        code: 'en',
        createdAt: '2021-03-09T14:57:03.016Z',
        updatedAt: '2021-03-09T14:57:03.016Z',
        isDefault: false,
      },
      {
        id: 2,
        name: 'French (France) (fr-FR)',
        code: 'fr-FR',
        createdAt: '2021-03-09T15:03:06.992Z',
        updatedAt: '2021-03-17T13:01:03.569Z',
        isDefault: true,
      },
      {
        id: 3,
        name: 'Another lang',
        code: 'de',
        createdAt: '2021-03-09T15:03:06.992Z',
        updatedAt: '2021-03-17T13:01:03.569Z',
        isDefault: false,
      },
    ];

    const ctPermissions = {
      'plugin::content-manager.explorer.create': [
        {
          id: 1325,
          action: 'plugin::content-manager.explorer.create',
          subject: 'api::address.address',
          properties: {
            fields: [
              'postal_coder',
              'categories',
              'cover',
              'images',
              'city',
              'likes',
              'json',
              'slug',
            ],
            locales: [],
          },
          conditions: [],
        },
      ],
      'plugin::content-manager.explorer.read': [
        {
          id: 1326,
          action: 'plugin::content-manager.explorer.read',
          subject: 'api::address.address',
          properties: {
            fields: [],
            locales: [],
          },
          conditions: [],
        },
      ],
    };

    const expected = null;
    const actual = getDefaultLocale(ctPermissions, locales);

    expect(actual).toEqual(expected);
  });
});
