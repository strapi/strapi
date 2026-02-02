import { enable, disable } from '../i18n';

const createDBQueryMock = () => {
  const obj = {
    deleteMany: jest.fn(() => obj),
    updateMany: jest.fn(() => obj),
  } as any;

  return jest.fn(() => obj);
};

describe('i18n - Migration - enable/disable localization on a CT', () => {
  beforeAll(() => {
    global.strapi = {
      db: {},
      plugins: {
        i18n: {
          services: {
            locales: {
              getDefaultLocale: jest.fn(() => 'default-locale'),
            },
            'content-types': {
              isLocalizedContentType: jest.fn(
                (contentType) => contentType?.pluginOptions?.i18n?.localized === true
              ),
            },
          },
        },
      },
      plugin: jest.fn((name) => global.strapi.plugins[name]),
    } as any;
  });

  describe('enable localization on a CT', () => {
    describe('Should not migrate', () => {
      test('non i18n => non i18n', async () => {
        strapi.db.query = createDBQueryMock();

        const previousDefinition = {};
        const definition = {};

        await enable({
          oldContentTypes: { test: previousDefinition as any },
          contentTypes: { test: definition as any },
        });

        expect(strapi.db.query).not.toHaveBeenCalled();
      });

      test('i18n => non i18n', async () => {
        strapi.db.query = createDBQueryMock();

        const previousDefinition = { pluginOptions: { i18n: { localized: true } } };
        const definition = {};

        await enable({
          oldContentTypes: { test: previousDefinition as any },
          contentTypes: { test: definition as any },
        });

        expect(strapi.db.query).not.toHaveBeenCalled();
      });

      test('i18n => i18n', async () => {
        strapi.db.query = createDBQueryMock();

        const previousDefinition = { pluginOptions: { i18n: { localized: true } } };
        const definition = { pluginOptions: { i18n: { localized: true } } };

        await enable({
          oldContentTypes: { test: previousDefinition as any },
          contentTypes: { test: definition as any },
        });

        expect(strapi.db.query).not.toHaveBeenCalled();
      });
    });

    describe('Should migrate', () => {
      test('non i18n => i18n ', async () => {
        strapi.db.query = createDBQueryMock();

        const previousDefinition = {};
        const definition = { pluginOptions: { i18n: { localized: true } } };

        await enable({
          oldContentTypes: { test: previousDefinition as any },
          contentTypes: { test: definition as any },
        });

        expect(strapi.plugins.i18n.services.locales.getDefaultLocale).toHaveBeenCalled();
        expect(strapi.db.query).toHaveBeenCalled();
      });
    });
  });

  describe('disable localization on a CT', () => {
    describe('Should not migrate', () => {
      test('non i18n => non i18n', async () => {
        strapi.db.query = createDBQueryMock();

        const previousDefinition = {};
        const definition = {};

        await disable({
          oldContentTypes: { test: previousDefinition as any },
          contentTypes: { test: definition as any },
        });
        expect(strapi.db.query).not.toHaveBeenCalled();
      });

      test('non i18n => i18n', async () => {
        strapi.db.query = createDBQueryMock();

        const previousDefinition = {};
        const definition = { pluginOptions: { i18n: { localized: true } } };

        await disable({
          oldContentTypes: { test: previousDefinition as any },
          contentTypes: { test: definition as any },
        });
        expect(strapi.db.query).not.toHaveBeenCalled();
      });

      test('i18n => i18n', async () => {
        strapi.db.query = createDBQueryMock();

        const previousDefinition = { pluginOptions: { i18n: { localized: true } } };
        const definition = { pluginOptions: { i18n: { localized: true } } };

        await disable({
          oldContentTypes: { test: previousDefinition as any },
          contentTypes: { test: definition as any },
        });
        expect(strapi.db.query).not.toHaveBeenCalled();
      });
    });

    describe('Should migrate', () => {
      test('i18n => non i18n - pg', async () => {
        const previousDefinition = {
          pluginOptions: { i18n: { localized: true } },
        };
        const definition = {};

        await disable({
          oldContentTypes: { test: previousDefinition as any },
          contentTypes: { test: definition as any },
        });

        expect(strapi.plugins.i18n.services.locales.getDefaultLocale).toHaveBeenCalled();
        expect(strapi.db.query).toHaveBeenCalled();
      });
    });
  });
});
