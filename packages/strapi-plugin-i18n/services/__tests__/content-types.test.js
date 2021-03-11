'use strict';

const {
  isLocalized,
  getNonLocalizedFields,
  addLocale,
  getNewLocalizationsFor,
} = require('../content-types');

describe('content-types service', () => {
  describe('isLocalized', () => {
    test('Checks for the i18N option', () => {
      expect(isLocalized({ pluginOptions: { i18n: { localized: false } } })).toBe(false);
      expect(isLocalized({ pluginOptions: { i18n: { localized: true } } })).toBe(true);
    });

    test('Defaults to false', () => {
      expect(isLocalized({})).toBe(false);
      expect(isLocalized({ pluginOptions: {} })).toBe(false);
      expect(isLocalized({ pluginOptions: { i18n: {} } })).toBe(false);
    });
  });

  describe('getNonLocalizedFields', () => {
    test('Uses the pluginOptions to detect non localized fields', () => {
      expect(
        getNonLocalizedFields({
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
            price: {
              type: 'integer',
            },
          },
        })
      ).toEqual(['stars', 'price']);
    });

    test('Consider relations to be always localized', () => {
      expect(
        getNonLocalizedFields({
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
            price: {
              type: 'integer',
            },
            relation: {
              model: 'user',
            },
            secondRelation: {
              collection: 'user',
            },
          },
        })
      ).toEqual(['stars', 'price']);
    });
  });

  describe('addLocale', () => {
    test('set default locale if the provided one is nil', async () => {
      const getDefaultLocale = jest.fn(() => Promise.resolve('en'));
      global.strapi = {
        plugins: {
          i18n: {
            services: {
              locales: {
                getDefaultLocale,
              },
            },
          },
        },
      };
      const entity = {};
      await addLocale(entity, null);

      expect(entity.locale).toBe('en');
    });

    test('set locale to the provided one if it exists', async () => {
      const findByCode = jest.fn(() => Promise.resolve('en'));
      global.strapi = {
        plugins: {
          i18n: {
            services: {
              locales: {
                findByCode,
              },
            },
          },
        },
      };
      const entity = {};
      await addLocale(entity, 'en');

      expect(entity.locale).toBe('en');
    });

    test("throw if provided locale doesn't exist", async () => {
      const findByCode = jest.fn(() => Promise.resolve(undefined));
      global.strapi = {
        plugins: {
          i18n: {
            services: {
              locales: {
                findByCode,
              },
            },
          },
        },
      };
      const entity = {};
      try {
        await addLocale(entity, 'en');
      } catch (e) {
        expect(e.message).toBe('Locale not found');
      }

      expect(findByCode).toHaveBeenCalledWith('en');
      expect.assertions(2);
    });
  });

  describe('getNewLocalizationsFor', () => {
    test("Throw if relatedEntity is provided but doesn't exist", async () => {
      const findOne = jest.fn(() => Promise.resolve(undefined));
      const relatedEntityId = 1;
      const model = 'application::country.country';
      const locale = 'fr';

      global.strapi = {
        query: () => ({
          findOne,
        }),
        getModel: () => ({ kind: 'collectionTypes' }),
      };

      try {
        await getNewLocalizationsFor({ relatedEntityId, model, locale });
      } catch (e) {
        expect(e.message).toBe("The related entity doesn't exist");
      }

      expect(findOne).toHaveBeenCalledWith({ id: relatedEntityId });
      expect.assertions(2);
    });

    test('Throw if locale already exists (1/2)', async () => {
      const relatedEntityId = 1;
      const relatedEntity = {
        id: relatedEntityId,
        locale: 'en',
        localizations: [],
      };
      const findOne = jest.fn(() => Promise.resolve(relatedEntity));
      const model = 'application::country.country';
      const locale = 'en';

      global.strapi = {
        query: () => ({
          findOne,
        }),
        getModel: () => ({ kind: 'collectionTypes' }),
      };

      try {
        await getNewLocalizationsFor({ relatedEntityId, model, locale });
      } catch (e) {
        expect(e.message).toBe('The entity already exists in this locale');
      }

      expect(findOne).toHaveBeenCalledWith({ id: relatedEntityId });
      expect.assertions(2);
    });

    test('Throw if locale already exists (2/2)', async () => {
      const relatedEntityId = 1;
      const relatedEntity = {
        id: relatedEntityId,
        locale: 'fr',
        localizations: [
          {
            id: 2,
            locale: 'en',
          },
        ],
      };
      const findOne = jest.fn(() => Promise.resolve(relatedEntity));
      const model = 'application::country.country';
      const locale = 'en';

      global.strapi = {
        query: () => ({
          findOne,
        }),
        getModel: () => ({ kind: 'collectionTypes' }),
      };

      try {
        await getNewLocalizationsFor({ relatedEntityId, model, locale });
      } catch (e) {
        expect(e.message).toBe('The entity already exists in this locale');
      }

      expect(findOne).toHaveBeenCalledWith({ id: relatedEntityId });
      expect.assertions(2);
    });

    test('Can add localizations (CT)', async () => {
      const relatedEntityId = 1;
      const relatedEntity = {
        id: relatedEntityId,
        locale: 'fr',
        localizations: [
          {
            id: 2,
            locale: 'en',
          },
          {
            id: 3,
            locale: 'it',
          },
        ],
      };
      const findOne = jest.fn(() => Promise.resolve(relatedEntity));
      const model = 'application::country.country';
      const locale = 'de';

      global.strapi = {
        query: () => ({
          findOne,
        }),
        getModel: () => ({ kind: 'collectionTypes' }),
      };

      const localizations = await getNewLocalizationsFor({ relatedEntityId, model, locale });

      expect(localizations).toEqual([1, 2, 3]);
      expect(findOne).toHaveBeenCalledWith({ id: relatedEntityId });
    });

    test('Can add localizations (CT)', async () => {
      const relatedEntity = {
        id: 1,
        locale: 'fr',
        localizations: [
          {
            id: 2,
            locale: 'en',
          },
          {
            id: 3,
            locale: 'it',
          },
        ],
      };
      const findOne = jest.fn(() => Promise.resolve(relatedEntity));
      const model = 'application::country.country';
      const locale = 'de';

      global.strapi = {
        query: () => ({
          findOne,
        }),
        getModel: () => ({ kind: 'singleType' }),
      };

      const localizations = await getNewLocalizationsFor({ model, locale });

      expect(localizations).toEqual([1, 2, 3]);
      expect(findOne).toHaveBeenCalledWith({});
    });

    test('Add empty localizations if none exist (CT)', async () => {
      const model = 'application::country.country';
      const locale = 'en';

      global.strapi = {
        getModel: () => ({ kind: 'collectionTypes' }),
      };

      const localizations = await getNewLocalizationsFor({
        relatedEntityId: undefined,
        model,
        locale,
      });

      expect(localizations).toEqual([]);
    });

    test('Add empty localizations if none exist (ST)', async () => {
      const model = 'application::country.country';
      const locale = 'en';

      const findOne = jest.fn(() => Promise.resolve(undefined));
      global.strapi = {
        query: () => ({
          findOne,
        }),
        getModel: () => ({ kind: 'singleType' }),
      };

      const localizations = await getNewLocalizationsFor({
        relatedEntityId: undefined,
        model,
        locale,
      });

      expect(localizations).toEqual([]);
    });
  });
});
