'use strict';

const { after } = require('../content-type');
const ctService = require('../../../../services/content-types');

describe('i18n - Migration - enable/disable localization on a CT', () => {
  beforeAll(() => {
    global.strapi = {
      plugins: { i18n: { services: { 'content-types': ctService } } },
    };
  });

  describe('enable localizations on a CT', () => {
    describe('Should not migrate', () => {
      test('non i18n => non i18n', async () => {
        const previousDefinition = {};
        const definition = {};

        await after({ definition, previousDefinition });
      });

      test('i18n => non i18n', async () => {
        const previousDefinition = { pluginOptions: { i18n: { localized: true } } };
        const definition = {};

        await after({ definition, previousDefinition });
      });

      test('i18n => i18n', async () => {
        const previousDefinition = { pluginOptions: { i18n: { localized: true } } };
        const definition = { pluginOptions: { i18n: { localized: true } } };

        await after({ definition, previousDefinition });
      });
    });
    describe('Should migrate', () => {
      describe('bookshelf', () => {
        test('non i18n => i18n - default locale in core_store', async () => {
          const model = { orm: 'bookshelf' };
          const previousDefinition = {};
          const definition = { pluginOptions: { i18n: { localized: true } } };
          const defaultLocaleRows = [{ value: '"fr"' }];
          const where = jest.fn().mockReturnValueOnce(Promise.resolve(defaultLocaleRows));

          const knexFunctions = { where };
          knexFunctions.select = () => knexFunctions;
          knexFunctions.update = jest.fn(() => knexFunctions);

          const knex = jest.fn(() => knexFunctions);
          const ORM = { knex };

          await after({ model, definition, previousDefinition, ORM });

          expect(knexFunctions.update).toHaveBeenCalledWith({ locale: 'fr' });
        });

        test('non i18n => i18n - default locale not in core_store', async () => {
          const model = { orm: 'bookshelf' };
          const previousDefinition = {};
          const definition = { pluginOptions: { i18n: { localized: true } } };
          const defaultLocaleRows = [];
          const where = jest.fn().mockReturnValueOnce(Promise.resolve(defaultLocaleRows));

          const knexFunctions = { where };
          knexFunctions.select = () => knexFunctions;
          knexFunctions.update = jest.fn(() => knexFunctions);

          const knex = jest.fn(() => knexFunctions);
          const ORM = { knex };

          await after({ model, definition, previousDefinition, ORM });

          expect(knexFunctions.update).toHaveBeenCalledWith({ locale: 'en' });
        });
      });
      describe('mongoose', () => {
        test('non i18n => i18n - default locale in core_store', async () => {
          const previousDefinition = {};
          const definition = { pluginOptions: { i18n: { localized: true } } };
          const defaultLocaleRows = [{ value: '"fr"' }];
          const find = jest.fn(() => Promise.resolve(defaultLocaleRows));
          const updateMany = jest.fn();
          const model = { orm: 'mongoose', updateMany };
          global.strapi.models = { core_store: { find } };

          await after({ model, definition, previousDefinition });

          expect(updateMany).toHaveBeenCalledWith(
            { $or: [{ locale: { $exists: false } }, { locale: null }] },
            { locale: 'fr' }
          );
        });

        test('non i18n => i18n - default locale not in core_store', async () => {
          const previousDefinition = {};
          const definition = { pluginOptions: { i18n: { localized: true } } };
          const defaultLocaleRows = [];
          const find = jest.fn(() => Promise.resolve(defaultLocaleRows));
          const updateMany = jest.fn();
          const model = { orm: 'mongoose', updateMany };
          global.strapi.models = { core_store: { find } };

          await after({ model, definition, previousDefinition });

          expect(updateMany).toHaveBeenCalledWith(
            { $or: [{ locale: { $exists: false } }, { locale: null }] },
            { locale: 'en' }
          );
        });
      });
    });
  });
});
