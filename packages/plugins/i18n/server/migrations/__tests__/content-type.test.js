'use strict';

const enable = require('../content-type/enable');
const disable = require('../content-type/disable');
const ctService = require('../../services/content-types')();

const createQueryBuilderMock = () => {
  const obj = {
    delete: jest.fn(() => obj),
    update: jest.fn(() => obj),
    where: jest.fn(() => obj),
    execute() {},
  };

  return jest.fn(() => obj);
};

describe('i18n - Migration - enable/disable localization on a CT', () => {
  beforeAll(() => {
    global.strapi = {
      db: {},
      plugins: {
        i18n: {
          services: {
            'content-types': ctService,
            locales: {
              getDefaultLocale: jest.fn(() => 'default-locale'),
            },
          },
        },
      },
    };
  });

  describe('enable localization on a CT', () => {
    describe('Should not migrate', () => {
      test('non i18n => non i18n', async () => {
        strapi.db.queryBuilder = createQueryBuilderMock();

        const previousDefinition = {};
        const definition = {};

        await enable({
          oldContentTypes: { test: previousDefinition },
          contentTypes: { test: definition },
        });

        expect(strapi.db.queryBuilder).not.toHaveBeenCalled();
      });

      test('i18n => non i18n', async () => {
        strapi.db.queryBuilder = createQueryBuilderMock();

        const previousDefinition = { pluginOptions: { i18n: { localized: true } } };
        const definition = {};

        await enable({
          oldContentTypes: { test: previousDefinition },
          contentTypes: { test: definition },
        });

        expect(strapi.db.queryBuilder).not.toHaveBeenCalled();
      });

      test('i18n => i18n', async () => {
        strapi.db.queryBuilder = createQueryBuilderMock();

        const previousDefinition = { pluginOptions: { i18n: { localized: true } } };
        const definition = { pluginOptions: { i18n: { localized: true } } };

        await enable({
          oldContentTypes: { test: previousDefinition },
          contentTypes: { test: definition },
        });

        expect(strapi.db.queryBuilder).not.toHaveBeenCalled();
      });
    });

    describe('Should migrate', () => {
      test('non i18n => i18n ', async () => {
        strapi.db.queryBuilder = createQueryBuilderMock();

        const previousDefinition = {};
        const definition = { pluginOptions: { i18n: { localized: true } } };

        await enable({
          oldContentTypes: { test: previousDefinition },
          contentTypes: { test: definition },
        });

        expect(strapi.plugins.i18n.services.locales.getDefaultLocale).toHaveBeenCalled();
        expect(strapi.db.queryBuilder).toHaveBeenCalled();
      });
    });
  });

  describe('disable localization on a CT', () => {
    describe('Should not migrate', () => {
      test('non i18n => non i18n', async () => {
        strapi.db.queryBuilder = createQueryBuilderMock();

        const previousDefinition = {};
        const definition = {};

        await disable({
          oldContentTypes: { test: previousDefinition },
          contentTypes: { test: definition },
        });
        expect(strapi.db.queryBuilder).not.toHaveBeenCalled();
      });

      test('non i18n => i18n', async () => {
        strapi.db.queryBuilder = createQueryBuilderMock();

        const previousDefinition = {};
        const definition = { pluginOptions: { i18n: { localized: true } } };

        await disable({
          oldContentTypes: { test: previousDefinition },
          contentTypes: { test: definition },
        });
        expect(strapi.db.queryBuilder).not.toHaveBeenCalled();
      });

      test('i18n => i18n', async () => {
        strapi.db.queryBuilder = createQueryBuilderMock();

        const previousDefinition = { pluginOptions: { i18n: { localized: true } } };
        const definition = { pluginOptions: { i18n: { localized: true } } };

        await disable({
          oldContentTypes: { test: previousDefinition },
          contentTypes: { test: definition },
        });
        expect(strapi.db.queryBuilder).not.toHaveBeenCalled();
      });
    });

    describe('Should migrate', () => {
      test('i18n => non i18n - pg', async () => {
        const previousDefinition = {
          pluginOptions: { i18n: { localized: true } },
        };
        const definition = {};

        await disable({
          oldContentTypes: { test: previousDefinition },
          contentTypes: { test: definition },
        });

        expect(strapi.plugins.i18n.services.locales.getDefaultLocale).toHaveBeenCalled();
        expect(strapi.db.queryBuilder).toHaveBeenCalled();
      });
    });
  });
});
