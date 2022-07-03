import cleanData from '../cleanData';

describe('i18n | Components | CMEditViewCopyLocale | utils', () => {
  describe('cleanData', () => {
    it('should change the localization key with the one passed in the argument', () => {
      const data = {
        address: 'test',
        addresseses: [],
        common: 'common',
        createdAt: '2021-03-17T15:34:05.866Z',
        createdBy: {
          blocked: null,
          email: 'cyril@strapi.io',
          firstname: 'cyril',
          id: 1,
          isActive: true,
          lastname: 'lopez',
          preferredLanguage: null,
          registrationToken: null,
          resetPasswordToken: null,
          username: null,
        },
        id: 14,
        locale: 'fr-FR',
        localizations: [
          {
            id: 13,
            locale: 'en',
            publishedAt: null,
          },
        ],
        name: 'name',
        publishedAt: null,
        updatedAt: '2021-03-17T15:34:18.958Z',
        updatedBy: {
          blocked: null,
          email: 'cyril@strapi.io',
          firstname: 'cyril',
          id: 1,
          isActive: true,
          lastname: 'lopez',
          preferredLanguage: null,
          registrationToken: null,
          resetPasswordToken: null,
          username: null,
        },
      };
      const contentType = {
        attributes: {
          address: { type: 'relation' },
          addresseses: { type: 'relation' },
          common: { pluginOptions: { i18n: { localized: true } }, type: 'text' },
          createdAt: { type: 'timestamp' },
          id: { type: 'integer' },
          name: { pluginOptions: { i18n: { localized: true } } },
          updatedAt: { type: 'timestamp' },
        },
      };
      const initLocalizations = [
        {
          id: 14,
          locale: 'fr-FR',
          publishedAt: null,
        },
      ];

      const expected = {
        common: 'common',
        locale: 'fr-FR',
        localizations: [
          {
            id: 14,
            locale: 'fr-FR',
            publishedAt: null,
          },
        ],
        name: 'name',
      };

      expect(cleanData(data, { contentType, components: {} }, initLocalizations)).toEqual(expected);
    });
  });
});
