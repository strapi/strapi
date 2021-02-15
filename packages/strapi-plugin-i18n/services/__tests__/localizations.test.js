'use strict';

const { addLocalizations, updateNonLocalizedFields } = require('../localizations');

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
      type: 'interger',
    },
  },
};

describe('localizations service', () => {
  describe('addLocalizations', () => {
    test('Does nothing if entry already as a localizations array', async () => {
      const entry = { localizations: [] };
      await addLocalizations(entry, { model });

      expect(entry).toEqual({ localizations: [] });
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

      expect(entry).toEqual({
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
});
