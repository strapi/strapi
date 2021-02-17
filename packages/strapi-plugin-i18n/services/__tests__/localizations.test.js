'use strict';

const {
  assignDefaultLocale,
  addLocalizations,
  updateNonLocalizedFields,
  removeEntryFromLocalizations,
} = require('../localizations');

const model = {
  uid: 'test-model',
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

describe('localizations service', () => {
  describe('assignDefaultLocale', () => {
    test('Does not change the input if locale is already defined', async () => {
      const input = { locale: 'myLocale' };
      await assignDefaultLocale(input);

      expect(input).toStrictEqual({ locale: 'myLocale' });
    });

    test('Use default locale to set the locale on the input data', async () => {
      const getDefaultLocaleMock = jest.fn(() => 'defaultLocale');

      global.strapi = {
        plugins: {
          i18n: {
            services: {
              locales: {
                getDefaultLocale: getDefaultLocaleMock,
              },
            },
          },
        },
      };

      const input = {};
      await assignDefaultLocale(input);

      expect(input).toStrictEqual({ locale: 'defaultLocale' });
      expect(getDefaultLocaleMock).toHaveBeenCalled();
    });
  });

  describe('addLocalizations', () => {
    test('Does nothing if entry already as a localizations array', async () => {
      const entry = { localizations: [] };
      await addLocalizations(entry, { model });

      expect(entry).toStrictEqual({ localizations: [] });
    });

    test('Updates entry in db', async () => {
      const update = jest.fn();
      global.strapi = {
        query() {
          return { update };
        },
      };

      const entry = { id: 1, locale: 'test' };

      await addLocalizations(entry, { model });

      expect(update).toHaveBeenCalledWith(
        { id: entry.id },
        { localizations: [{ id: entry.id, locale: entry.locale }] }
      );
    });

    test('Sets localizations property on entry', async () => {
      const update = jest.fn();
      global.strapi = {
        query() {
          return { update };
        },
      };

      const entry = { id: 1, locale: 'test' };

      await addLocalizations(entry, { model });

      expect(entry).toStrictEqual({
        id: entry.id,
        locale: entry.locale,
        localizations: [
          {
            id: entry.id,
            locale: entry.locale,
          },
        ],
      });
    });
  });

  describe('updateNonLocalizedFields', () => {
    test('Does nothing if no localizations set', async () => {
      const update = jest.fn();
      global.strapi = {
        query() {
          return { update };
        },
      };

      const entry = { id: 1, locale: 'test' };

      await updateNonLocalizedFields(entry, { model });

      expect(update).not.toHaveBeenCalled();
    });

    test('Does not update the current locale', async () => {
      const update = jest.fn();
      global.strapi = {
        query() {
          return { update };
        },
      };

      const entry = { id: 1, locale: 'test', localizations: [{ id: 1, locale: 'test' }] };

      await updateNonLocalizedFields(entry, { model });

      expect(update).not.toHaveBeenCalled();
    });

    test('Updates locales with non localized fields only', async () => {
      const update = jest.fn();
      global.strapi = {
        query() {
          return { update };
        },
      };

      const entry = {
        id: 1,
        locale: 'test',
        title: 'Localized',
        stars: 1,
        localizations: [
          { id: 1, locale: 'test' },
          { id: 2, locale: 'fr' },
        ],
      };

      await updateNonLocalizedFields(entry, { model });

      expect(update).toHaveBeenCalledTimes(1);
      expect(update).toHaveBeenCalledWith({ id: 2 }, { stars: 1 });
    });
  });

  describe('removeEntryFromLocalizations', () => {
    test('Does nothing if no localizations set', async () => {
      const update = jest.fn();
      global.strapi = {
        query() {
          return { update };
        },
      };

      const entry = { id: 1, locale: 'test' };

      await removeEntryFromLocalizations(entry, { model });

      expect(update).not.toHaveBeenCalled();
    });

    test('Removes entry from localizations', async () => {
      const update = jest.fn();
      global.strapi = {
        query() {
          return { update };
        },
      };

      const entry = {
        id: 1,
        locale: 'mainLocale',
        localizations: [
          { id: 1, locale: 'mainLocale' },
          { id: 2, locale: 'otherLocale' },
        ],
      };

      await removeEntryFromLocalizations(entry, { model });

      expect(update).toHaveBeenCalledTimes(1);
      expect(update).toHaveBeenCalledWith(
        { id: 2 },
        { localizations: [{ id: 2, locale: 'otherLocale' }] }
      );
    });
  });
});
