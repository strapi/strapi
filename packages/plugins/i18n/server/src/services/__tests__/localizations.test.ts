import localizationsService from '../localizations';
import localesService from '../locales';
import contentTypesService from '../content-types';

const { syncNonLocalizedAttributes } = localizationsService();
const locales = localesService();
const contentTypes = contentTypesService();

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
  documents: () => ({
    updateComponents: jest.fn(),
    omitComponentData: jest.fn(),
  }),
} as any;

const findMany = jest.fn(() => [{ id: 1, locale: 'fr' }]);
const updateMany = jest.fn();
global.strapi.db.query = () => {
  return { findMany, updateMany } as any;
};

const defaultLocale = 'en';
describe('localizations service', () => {
  describe('syncNonLocalizedAttributes', () => {
    test('Does nothing if no localizations set', async () => {
      const entry = { id: 1, locale: 'test' };

      await syncNonLocalizedAttributes(entry, model);

      expect(findMany).not.toHaveBeenCalled();
    });

    test('Does not update if all the fields are localized', async () => {
      const entry = { id: 1, documentId: 'Doc1', locale: defaultLocale, title: 'test', stars: 100 };

      await syncNonLocalizedAttributes(entry, allLocalizedModel);

      expect(updateMany).not.toHaveBeenCalled();
    });

    test('Does not update the current locale', async () => {
      const update = jest.fn();
      global.strapi.query = () => {
        return { update } as any;
      };

      const entry = { id: 1, documentId: 'Doc1', stars: 10, locale: defaultLocale };

      await syncNonLocalizedAttributes(entry, model);

      expect(updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            documentId: 'Doc1',
            locale: { $in: ['fr'] },
            publishedAt: null,
          },
        })
      );
    });
  });
});
