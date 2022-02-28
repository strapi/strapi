import generateOptions from '../generateOptions';

const appLocales = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
  { code: 'it', name: 'Italian' },
];

describe('I18n | Components | CMEditViewCopyLocale | utils', () => {
  describe('generateOptions', () => {
    it('should return an array', () => {
      expect(generateOptions([])).toEqual([]);
    });

    it('should remove the current locale from the array', () => {
      const permissions = [
        { properties: { locales: [] } },
        { properties: { locales: ['en', 'fr', 'it'] } },
      ];
      const currentLocale = 'en';
      const localizations = [
        { publishedAt: 'test', locale: 'en', id: 1 },
        { publishedAt: 'test', locale: 'fr', id: 2 },
        { publishedAt: 'test', locale: 'it', id: 3 },
      ];

      const expected = [{ label: 'French', value: 2 }, { label: 'Italian', value: 3 }];

      expect(generateOptions(appLocales, currentLocale, localizations, permissions)).toEqual(
        expected
      );
    });

    it('should remove the locales that are not contained in the localizations array', () => {
      const permissions = [
        { properties: { locales: [] } },
        { properties: { locales: ['en', 'fr', 'it'] } },
      ];
      const localizations = [
        { publishedAt: 'test', locale: 'en', id: 1 },
        { publishedAt: 'test', locale: 'fr', id: 2 },
      ];

      const expected = [{ label: 'English', value: 1 }, { label: 'French', value: 2 }];
      const currentLocale = 'test';
      expect(generateOptions(appLocales, currentLocale, localizations, permissions)).toEqual(
        expected
      );
    });

    it('should remove the locales when the user does not have the permission to read', () => {
      const permissions = [
        { properties: { locales: ['en'] } },
        { properties: { locales: ['it'] } },
      ];
      const currentLocale = 'test';
      const localizations = [
        { publishedAt: 'test', locale: 'en', id: 1 },
        { publishedAt: 'test', locale: 'fr', id: 2 },
        { publishedAt: 'test', locale: 'it', id: 3 },
      ];

      const expected = [{ label: 'English', value: 1 }, { label: 'Italian', value: 3 }];

      expect(generateOptions(appLocales, currentLocale, localizations, permissions)).toEqual(
        expected
      );
    });
  });
});
