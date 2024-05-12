import { Locale } from '../../store/reducers';
import { getInitialLocale, getLocaleFromQuery, getDefaultLocale } from '../locales';

describe('locales', () => {
  describe('getLocaleFromQuery', () => {
    it('returns the locale from the query', () => {
      const query = {
        plugins: {
          i18n: {
            locale: 'en-GB',
          },
        },
      };

      expect(getLocaleFromQuery(query)).toBe('en-GB');
    });

    it("should return undefined if the locale doesn't exist", () => {
      expect(
        getLocaleFromQuery({
          plugins: {
            i18n: {},
          },
        })
      ).toBe(undefined);
      expect(
        getLocaleFromQuery({
          plugins: {},
        })
      ).toBe(undefined);
      expect(getLocaleFromQuery({})).toBe(undefined);
    });

    it('should return the default value if the locale does not exist', () => {
      expect(
        getLocaleFromQuery(
          {
            plugins: {
              i18n: {},
            },
          },
          'en-GB'
        )
      ).toBe('en-GB');
      expect(
        getLocaleFromQuery(
          {
            plugins: {},
          },
          'en-GB'
        )
      ).toBe('en-GB');
      expect(getLocaleFromQuery({}, 'en-GB')).toBe('en-GB');
    });
  });

  describe('getInitialLocale', () => {
    it('gives "fr-FR" when the query.plugins.locale is "fr-FR"', () => {
      const query = {
        page: '1',
        pageSize: '10',
        sort: 'Name:ASC',
        plugins: {
          i18n: { locale: 'en-GB' },
        },
      };

      const locales: Locale[] = [
        {
          id: 1,
          name: 'English',
          code: 'en-GB',
          createdAt: '2021-03-09T14:57:03.016Z',
          updatedAt: '2021-03-09T14:57:03.016Z',
          isDefault: true,
        },
        {
          id: 2,
          name: 'French (France) (fr-FR)',
          code: 'fr-FR',
          createdAt: '2021-03-09T15:03:06.992Z',
          updatedAt: '2021-03-09T15:03:06.996Z',
          isDefault: false,
        },
      ];

      const actual = getInitialLocale(query, locales);

      expect(actual).toMatchInlineSnapshot(`
        {
          "code": "en-GB",
          "createdAt": "2021-03-09T14:57:03.016Z",
          "id": 1,
          "isDefault": true,
          "name": "English",
          "updatedAt": "2021-03-09T14:57:03.016Z",
        }
      `);
    });

    it('gives the default locale ("en") when there s no locale in the query', () => {
      const query = {
        page: '1',
        pageSize: '10',
        sort: 'Name:ASC',
        plugins: {
          something: 'great',
        },
      };

      const locales: Locale[] = [
        {
          id: 2,
          name: 'French (France) (fr-FR)',
          code: 'fr-FR',
          createdAt: '2021-03-09T15:03:06.992Z',
          updatedAt: '2021-03-09T15:03:06.996Z',
          isDefault: false,
        },
        {
          id: 1,
          name: 'English',
          code: 'en-GB',
          createdAt: '2021-03-09T14:57:03.016Z',
          updatedAt: '2021-03-09T14:57:03.016Z',
          isDefault: true,
        },
      ];

      const actual = getInitialLocale(query, locales);

      expect(actual).toMatchInlineSnapshot(`
        {
          "code": "en-GB",
          "createdAt": "2021-03-09T14:57:03.016Z",
          "id": 1,
          "isDefault": true,
          "name": "English",
          "updatedAt": "2021-03-09T14:57:03.016Z",
        }
      `);
    });

    it('gives "undefined" when theres no locale', () => {
      /**
       * @note this case should not exist since at least one locale
       * is created on the backend when plug-in i18n. But you can
       * never trust the server.
       */
      const query = {
        page: '1',
        pageSize: '10',
        sort: 'Name:ASC',
        plugins: {
          something: 'great',
        },
      };

      const locales: Locale[] = [];

      const actual = getInitialLocale(query, locales);

      expect(actual).toMatchInlineSnapshot(`undefined`);
    });
  });

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
});
