'use strict';

const { assignDefaultLocaleToEntries, syncLocalizations, syncNonLocalizedAttributes } =
  require('../localizations')();

const locales = require('../locales')();
const contentTypes = require('../content-types')();

const model = {
  uid: 'test-model',
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  attributes: {
    title: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
    stars: {
      type: 'integer',
    },
  },
};

const allLocalizedModel = {
  uid: 'test-model',
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  attributes: {
    title: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
    stars: {
      type: 'integer',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
  },
};

const setGlobalStrapi = () => {
  global.strapi = {
    plugins: {
      i18n: {
        services: {
          locales,
          'content-types': contentTypes,
        },
      },
    },
    db: {
      dialect: {
        client: 'sqlite',
      },
    },
  };
};

describe('localizations service', () => {
  describe('assignDefaultLocaleToEntries', () => {
    test('Does not change the input if locale is already defined (single entry)', async () => {
      setGlobalStrapi();
      const input = { locale: 'myLocale' };
      await assignDefaultLocaleToEntries(input);

      expect(input).toStrictEqual({ locale: 'myLocale' });
    });

    test('Use default locale to set the locale on the input data (single entry)', async () => {
      setGlobalStrapi();

      const getDefaultLocaleMock = jest.fn(() => 'defaultLocale');

      global.strapi.plugins.i18n.services.locales.getDefaultLocale = getDefaultLocaleMock;

      const input = {};
      await assignDefaultLocaleToEntries(input);

      expect(input).toStrictEqual({ locale: 'defaultLocale' });
      expect(getDefaultLocaleMock).toHaveBeenCalled();
    });

    test('Does not change the input if locale is already defined (multiple entries)', async () => {
      setGlobalStrapi();
      const input = [{ locale: 'myLocale' }, { locale: 'mylocalebis' }];
      await assignDefaultLocaleToEntries(input);

      expect(input).toStrictEqual([{ locale: 'myLocale' }, { locale: 'mylocalebis' }]);
    });

    test('Use default locale to set the locale on the entries missing it (multiple entries)', async () => {
      setGlobalStrapi();

      const getDefaultLocaleMock = jest.fn(() => 'defaultLocale');

      global.strapi.plugins.i18n.services.locales.getDefaultLocale = getDefaultLocaleMock;

      const input = [{ locale: 'mylocale' }, {}];
      await assignDefaultLocaleToEntries(input);

      expect(input).toStrictEqual([{ locale: 'mylocale' }, { locale: 'defaultLocale' }]);
      expect(getDefaultLocaleMock).toHaveBeenCalled();
    });
  });

  describe('syncLocalizations', () => {
    test('Updates every other localizations with correct ids', async () => {
      setGlobalStrapi();

      const update = jest.fn();
      global.strapi.query = () => {
        return { update };
      };

      const localizations = [{ id: 2 }, { id: 3 }];
      const entry = { id: 1, locale: 'test', localizations };

      await syncLocalizations(entry, { model });

      expect(update).toHaveBeenCalledTimes(localizations.length);
      expect(update).toHaveBeenNthCalledWith(1, {
        where: { id: 2 },
        data: { localizations: [1, 3] },
      });

      expect(update).toHaveBeenNthCalledWith(2, {
        where: { id: 3 },
        data: { localizations: [1, 2] },
      });
    });
  });

  describe('syncNonLocalizedAttributes', () => {
    test('Does nothing if no localizations set', async () => {
      setGlobalStrapi();

      const update = jest.fn();
      global.strapi.query = () => {
        return { update };
      };

      const entry = { id: 1, locale: 'test' };

      await syncNonLocalizedAttributes(entry, { model });

      expect(update).not.toHaveBeenCalled();
    });

    test('Does not update the current locale', async () => {
      setGlobalStrapi();

      const update = jest.fn();
      global.strapi.query = () => {
        return { update };
      };

      const entry = { id: 1, locale: 'test', localizations: [] };

      await syncNonLocalizedAttributes(entry, { model });

      expect(update).not.toHaveBeenCalled();
    });

    test('Does not update if all the fields are localized', async () => {
      setGlobalStrapi();

      const update = jest.fn();
      global.strapi.query = () => {
        return { update };
      };

      const entry = { id: 1, locale: 'test', localizations: [] };

      await syncNonLocalizedAttributes(entry, { model: allLocalizedModel });

      expect(update).not.toHaveBeenCalled();
    });

    test('Updates locales with non localized fields only', async () => {
      setGlobalStrapi();

      const update = jest.fn();
      global.strapi.entityService = { update };

      const entry = {
        id: 1,
        locale: 'test',
        title: 'Localized',
        stars: 1,
        localizations: [{ id: 2, locale: 'fr' }],
      };

      await syncNonLocalizedAttributes(entry, { model });

      expect(update).toHaveBeenCalledTimes(1);
      expect(update).toHaveBeenCalledWith(model.uid, 2, { data: { stars: 1 } });
    });
  });
});
