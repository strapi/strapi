import type { Schema } from '@strapi/types';

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
} as unknown as Schema.ContentType;

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
} as unknown as Schema.ContentType;

global.strapi = {
  plugins: {
    i18n: {
      services: {
        locales,
        'content-types': contentTypes,
      },
    },
  },
  log: { warn: jest.fn() },
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

    describe('shared components holding relations', () => {
      const relation = (relationType: string) => ({
        type: 'relation',
        relation: relationType,
        target: 'api::tag.tag',
      });

      const nestedComponent = {
        uid: 'shared.nested',
        attributes: { tags: relation('manyToMany') },
      };

      const blockComponent = {
        uid: 'shared.block',
        attributes: {
          mode: { type: 'string' },
          tag: relation('oneToOne'),
          tags: relation('manyToMany'),
          nested: { type: 'component', component: 'shared.nested', repeatable: false },
        },
      };

      const sharedOptions = { pluginOptions: { i18n: { localized: false } } };

      const modelWithSharedComponents = {
        uid: 'test-model',
        pluginOptions: { i18n: { localized: true } },
        attributes: {
          title: { type: 'string', pluginOptions: { i18n: { localized: true } } },
          stars: { type: 'integer' },
          block: {
            type: 'component',
            component: 'shared.block',
            repeatable: false,
            ...sharedOptions,
          },
          blocks: {
            type: 'component',
            component: 'shared.block',
            repeatable: true,
            ...sharedOptions,
          },
          zone: { type: 'dynamiczone', components: ['shared.block'], ...sharedOptions },
        },
      } as unknown as Schema.ContentType;

      const components: Record<string, unknown> = {
        'shared.block': blockComponent,
        'shared.nested': nestedComponent,
      };

      const updateComponents = jest.fn();
      const transformData = jest.fn();
      const original = {
        components: global.strapi.components,
        getModel: global.strapi.getModel,
        documents: global.strapi.documents,
      };

      const sync = (data: Record<string, unknown>) =>
        syncNonLocalizedAttributes(
          { id: 1, documentId: 'Doc1', locale: defaultLocale, ...data },
          modelWithSharedComponents
        );

      beforeAll(() => {
        global.strapi.components = components as any;
        global.strapi.getModel = jest.fn((uid: string) => components[uid]) as any;
        global.strapi.documents = Object.assign(
          () => ({
            updateComponents,
            omitComponentData: jest.fn((data) => ({ stars: data.stars })),
          }),
          { utils: { transformData } }
        ) as any;
      });

      afterAll(() => {
        Object.assign(global.strapi, original);
      });

      beforeEach(() => {
        jest.clearAllMocks();
        updateComponents.mockResolvedValue({});
      });

      test('Leaves a repeatable component alone when a relation has no entry in the locale', async () => {
        transformData.mockResolvedValue({
          stars: 5,
          blocks: [{ mode: 'a', tag: { set: [] } }],
        });

        await sync({ stars: 5, blocks: [{ mode: 'a', tag: { documentId: 'Tag1' } }] });

        expect(updateComponents).toHaveBeenCalledWith(expect.anything(), { stars: 5 });
        expect(global.strapi.log.warn).toHaveBeenCalledWith(expect.stringContaining('blocks'));
        // The rest of the shared fields still sync
        expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: { stars: 5 } }));
      });

      test('Leaves a component alone when only some targets of a relation exist in the locale', async () => {
        transformData.mockResolvedValue({ block: { tags: { set: [{ id: 7 }] } } });

        await sync({ block: { tags: [{ documentId: 'Tag1' }, { documentId: 'Tag2' }] } });

        expect(updateComponents).toHaveBeenCalledWith(expect.anything(), {});
      });

      test('Leaves a component alone when the relation is lost in a nested component', async () => {
        transformData.mockResolvedValue({ block: { nested: { tags: { set: [] } } } });

        await sync({ block: { nested: { tags: [{ documentId: 'Tag1' }] } } });

        expect(updateComponents).toHaveBeenCalledWith(expect.anything(), {});
      });

      test('Leaves a dynamic zone alone when one of its components loses a relation', async () => {
        const target = { documentId: 'Tag1' };

        transformData.mockResolvedValue({
          zone: [
            { __component: 'shared.block', tag: { set: [{ id: 7 }] } },
            { __component: 'shared.block', tag: { set: [] } },
          ],
        });

        await sync({
          zone: [
            { __component: 'shared.block', tag: target },
            { __component: 'shared.block', tag: target },
          ],
        });

        expect(updateComponents).toHaveBeenCalledWith(expect.anything(), {});
      });

      test('Only skips the attribute that lost a relation', async () => {
        const kept = [{ mode: 'a', tag: { set: [{ id: 7 }] } }];

        transformData.mockResolvedValue({ blocks: kept, block: { tag: { set: [] } } });

        await sync({
          blocks: [{ mode: 'a', tag: { documentId: 'Tag1' } }],
          block: { tag: { documentId: 'Tag2' } },
        });

        expect(updateComponents).toHaveBeenCalledWith(expect.anything(), { blocks: kept });
      });

      test('Syncs a component whose relations all exist in the locale', async () => {
        const transformed = {
          blocks: [{ mode: 'a', tag: { set: [{ id: 7 }] }, tags: { set: [{ id: 8 }, { id: 9 }] } }],
        };

        transformData.mockResolvedValue(transformed);

        await sync({
          blocks: [
            {
              mode: 'a',
              tag: { documentId: 'Tag1' },
              tags: [{ documentId: 'Tag2' }, { documentId: 'Tag3' }],
            },
          ],
        });

        expect(updateComponents).toHaveBeenCalledWith(expect.anything(), transformed);
        expect(global.strapi.log.warn).not.toHaveBeenCalled();
      });

      test('Syncs a component when one document maps to more entries than the source holds', async () => {
        const transformed = { block: { tag: { set: [{ id: 7 }, { id: 8 }] } } };

        transformData.mockResolvedValue(transformed);

        await sync({ block: { tag: { documentId: 'Tag1' } } });

        expect(updateComponents).toHaveBeenCalledWith(expect.anything(), transformed);
      });

      test('Syncs a component whose relation is empty in the source', async () => {
        const transformed = { blocks: [{ mode: 'a', tag: null, tags: { set: [] } }] };

        transformData.mockResolvedValue(transformed);

        await sync({ blocks: [{ mode: 'a', tag: null, tags: [] }] });

        expect(updateComponents).toHaveBeenCalledWith(expect.anything(), transformed);
      });
    });
  });
});
