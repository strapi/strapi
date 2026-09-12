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
  log: { warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
  db: {
    dialect: {
      client: 'sqlite',
    },
  },
  documents: Object.assign(
    () => ({
      updateComponents: jest.fn(),
      omitComponentData: jest.fn(() => ({})),
    }),
    {
      utils: {
        transformData: jest.fn(async () => ({})),
      },
    }
  ),
} as any;

const findMany = jest.fn(() => [{ id: 1, locale: 'fr' }]);
const update = jest.fn();
global.strapi.db.query = () => {
  return { findMany, update } as any;
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

      expect(update).not.toHaveBeenCalled();
    });

    test('Does not update the current locale', async () => {
      const entry = { id: 1, documentId: 'Doc1', stars: 10, locale: defaultLocale };

      await syncNonLocalizedAttributes(entry, model);

      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {},
          where: { documentId: 'Doc1', locale: { $eq: 'fr' }, publishedAt: null },
        })
      );
    });

    test('Leaves a shared component alone when its relation cannot be resolved in the target locale', async () => {
      const componentSchema = {
        uid: 'shared.block',
        attributes: {
          mode: { type: 'string' },
          tag: { type: 'relation', relation: 'oneToOne', target: 'api::tag.tag' },
        },
      };

      const modelWithSharedBlocks = {
        uid: 'test-model',
        pluginOptions: { i18n: { localized: true } },
        attributes: {
          title: { type: 'string', pluginOptions: { i18n: { localized: true } } },
          blocks: {
            type: 'component',
            repeatable: true,
            component: 'shared.block',
            pluginOptions: { i18n: { localized: false } },
          },
        },
      };

      const updateComponents = jest.fn(() => ({}));
      const previousComponents = global.strapi.components;
      const previousGetModel = global.strapi.getModel;
      const previousDocuments = global.strapi.documents;

      global.strapi.components = { 'shared.block': componentSchema } as any;
      global.strapi.getModel = jest.fn(() => componentSchema) as any;
      global.strapi.documents = Object.assign(
        () => ({ updateComponents, omitComponentData: jest.fn(() => ({})) }),
        {
          utils: {
            // The tag has no entry in `fr`, so the transform resolves it to an empty set.
            transformData: jest.fn(async () => ({
              blocks: [{ mode: 'a', tag: { set: [] } }],
            })),
          },
        }
      ) as any;

      const entry = {
        id: 1,
        documentId: 'Doc1',
        locale: defaultLocale,
        blocks: [{ mode: 'a', tag: { documentId: 'Tag1' } }],
      };

      await syncNonLocalizedAttributes(entry, modelWithSharedBlocks as any);

      expect(updateComponents).toHaveBeenCalledWith(
        expect.anything(),
        expect.not.objectContaining({ blocks: expect.anything() })
      );

      global.strapi.components = previousComponents;
      global.strapi.getModel = previousGetModel;
      global.strapi.documents = previousDocuments;
    });

    test('Still syncs a shared component whose relation resolves in the target locale', async () => {
      const componentSchema = {
        uid: 'shared.block',
        attributes: {
          mode: { type: 'string' },
          tag: { type: 'relation', relation: 'oneToOne', target: 'api::tag.tag' },
        },
      };

      const modelWithSharedBlocks = {
        uid: 'test-model',
        pluginOptions: { i18n: { localized: true } },
        attributes: {
          blocks: {
            type: 'component',
            repeatable: true,
            component: 'shared.block',
            pluginOptions: { i18n: { localized: false } },
          },
        },
      };

      const updateComponents = jest.fn(() => ({}));
      const previousComponents = global.strapi.components;
      const previousGetModel = global.strapi.getModel;
      const previousDocuments = global.strapi.documents;

      global.strapi.components = { 'shared.block': componentSchema } as any;
      global.strapi.getModel = jest.fn(() => componentSchema) as any;
      global.strapi.documents = Object.assign(
        () => ({ updateComponents, omitComponentData: jest.fn(() => ({})) }),
        {
          utils: {
            transformData: jest.fn(async () => ({
              blocks: [{ mode: 'a', tag: { set: [{ id: 7 }] } }],
            })),
          },
        }
      ) as any;

      const entry = {
        id: 1,
        documentId: 'Doc1',
        locale: defaultLocale,
        blocks: [{ mode: 'a', tag: { documentId: 'Tag1' } }],
      };

      await syncNonLocalizedAttributes(entry, modelWithSharedBlocks as any);

      expect(updateComponents).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ blocks: [{ mode: 'a', tag: { set: [{ id: 7 }] } }] })
      );

      global.strapi.components = previousComponents;
      global.strapi.getModel = previousGetModel;
      global.strapi.documents = previousDocuments;
    });
  });
});
