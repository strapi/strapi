import type { Core } from '@strapi/types';

import { PRODUCT_UID, CATEGORY_UID, models } from './utils';
import { transformParamsDocumentId } from '../id-transform';

const findProducts = jest.fn(() => ({}));
const findCategories = jest.fn(() => ({}));

const findManyQueries = {
  [PRODUCT_UID]: findProducts,
  [CATEGORY_UID]: findCategories,
} as Record<string, jest.Mock>;

describe('Transform relational data', () => {
  global.strapi = {
    getModel: (uid: string) => models[uid],
    plugins: {
      i18n: {
        services: {
          'content-types': {
            isLocalizedContentType() {
              return true;
            },
          },
          locales: {
            getDefaultLocale() {
              return 'en';
            },
          },
        },
      },
    },
    db: {
      query: jest.fn((uid) => ({ findMany: findManyQueries[uid] })),
    },
  } as unknown as Core.Strapi;

  beforeEach(() => {
    findCategories.mockReturnValue([
      { id: 'doc1-en-draft', documentId: 'doc1', locale: 'en', publishedAt: null },
      { id: 'doc1-fr-draft', documentId: 'doc1', locale: 'fr', publishedAt: null },
      { id: 'doc2-en-draft', documentId: 'doc2', locale: 'en', publishedAt: null },
      { id: 'doc3-en-draft', documentId: 'doc3', locale: 'en', publishedAt: null },
      { id: 'doc4-en-draft', documentId: 'doc4', locale: 'en', publishedAt: null },
      { id: 'doc5-en-draft', documentId: 'doc5', locale: 'en', publishedAt: null },
      { id: 'doc6-en-draft', documentId: 'doc6', locale: 'en', publishedAt: null },
      { id: 'doc7-en-draft', documentId: 'doc7', locale: 'en', publishedAt: null },
      { id: 'doc8-en-draft', documentId: 'doc8', locale: 'en', publishedAt: null },
      { id: 'doc9-en-draft', documentId: 'doc9', locale: 'en', publishedAt: null },
      { id: 'doc10-en-draft', documentId: 'doc10', locale: 'en', publishedAt: null },
    ]);

    findProducts.mockReturnValue([
      { id: 'doc1-en-draft', documentId: 'doc1', locale: 'en', publishedAt: null },
      { id: 'doc1-fr-draft', documentId: 'doc1', locale: 'fr', publishedAt: null },
      { id: 'doc2-en-draft', documentId: 'doc2', locale: 'en', publishedAt: null },
      { id: 'doc3-en-draft', documentId: 'doc3', locale: 'en', publishedAt: null },
    ]);
  });

  describe('Shorthand syntax', () => {
    it('Shorthand syntax', async () => {
      const { data } = await transformParamsDocumentId(PRODUCT_UID, {
        data: {
          name: 'test',
          categories: ['doc1', 'doc2', 'doc3'],
          category: 'doc4',
          relatedProducts: ['doc1', 'doc2', 'doc3'],
        },
        locale: 'en',
        status: 'draft',
      });

      expect(data).toEqual({
        name: 'test',
        categories: {
          set: [{ id: 'doc1-en-draft' }, { id: 'doc2-en-draft' }, { id: 'doc3-en-draft' }],
        },
        category: { set: [{ id: 'doc4-en-draft' }] },
        relatedProducts: {
          set: [{ id: 'doc1-en-draft' }, { id: 'doc2-en-draft' }, { id: 'doc3-en-draft' }],
        },
      });
    });

    it('Should ignore number values', async () => {
      const { data } = await transformParamsDocumentId(PRODUCT_UID, {
        data: {
          name: 'test',
          categories: [1, 2, 'doc1'],
          category: 4,
        },
        locale: 'en',
        status: 'draft',
      });

      expect(data).toEqual({
        name: 'test',
        categories: {
          set: [{ id: 1 }, { id: 2 }, { id: 'doc1-en-draft' }],
        },
        category: { set: [{ id: 4 }] },
      });
    });

    it('Handles nullish values', async () => {
      const { data } = await transformParamsDocumentId(PRODUCT_UID, {
        data: {
          name: 'test',
          categories: undefined,
          category: null,
        },
        locale: 'en',
        status: 'draft',
      });

      expect(data).toEqual({
        name: 'test',
        categories: undefined,
        category: null,
      });
    });
  });

  describe('Longhand syntax', () => {
    it('Longhand syntax', async () => {
      const { data } = await transformParamsDocumentId(PRODUCT_UID, {
        data: {
          name: 'test',
          categories: [{ documentId: 'doc1' }, { documentId: 'doc2' }, { documentId: 'doc3' }],
          category: { documentId: 'doc4' },
        },
        locale: 'en',
        status: 'draft',
      });

      expect(data).toMatchObject({
        name: 'test',
        categories: {
          set: [{ id: 'doc1-en-draft' }, { id: 'doc2-en-draft' }, { id: 'doc3-en-draft' }],
        },
        category: { set: [{ id: 'doc4-en-draft' }] },
      });
    });

    it('Longhand syntax with id', async () => {
      const { data } = await transformParamsDocumentId(PRODUCT_UID, {
        data: {
          name: 'test',
          categories: [{ id: 1 }],
          category: { id: 2 },
        },
        locale: 'en',
        status: 'draft',
      });

      expect(data).toMatchObject({
        name: 'test',
        categories: { set: [{ id: 1 }] },
        category: { set: [{ id: 2 }] },
      });
    });

    it('Document id takes priority over id', async () => {
      const { data } = await transformParamsDocumentId(PRODUCT_UID, {
        data: {
          name: 'test',
          categories: [{ id: 1, documentId: 'doc2' }],
          category: { id: 2, documentId: 'doc4' },
        },
        locale: 'en',
        status: 'draft',
      });

      expect(data).toMatchObject({
        name: 'test',
        categories: { set: [{ id: 'doc2-en-draft' }] },
        category: { set: [{ id: 'doc4-en-draft' }] },
      });
    });
  });

  it('Set', async () => {
    const { data } = await transformParamsDocumentId(PRODUCT_UID, {
      data: {
        name: 'test',
        categories: { set: ['doc1', 'doc2', 'doc3'] },
        category: { set: 'doc4' },
      },
      locale: 'en',
      status: 'draft',
    });

    expect(data).toEqual({
      name: 'test',
      categories: {
        set: [{ id: 'doc1-en-draft' }, { id: 'doc2-en-draft' }, { id: 'doc3-en-draft' }],
      },
      category: { set: [{ id: 'doc4-en-draft' }] },
    });
  });

  it('Connect', async () => {
    const { data } = await transformParamsDocumentId(PRODUCT_UID, {
      data: {
        name: 'test',
        categories: { connect: ['doc1', 'doc2', 'doc3'] },
        category: { connect: 'doc4' },
      },
      locale: 'en',
      status: 'draft',
    });

    expect(data).toEqual({
      name: 'test',
      categories: {
        connect: [{ id: 'doc1-en-draft' }, { id: 'doc2-en-draft' }, { id: 'doc3-en-draft' }],
      },
      category: { connect: [{ id: 'doc4-en-draft' }] },
    });
  });

  it('Connect before', async () => {
    const { data } = await transformParamsDocumentId(PRODUCT_UID, {
      data: {
        name: 'test',
        categories: { connect: [{ documentId: 'doc1', position: { before: 'doc2' } }] },
        category: { connect: 'doc4' },
      },
      locale: 'en',
      status: 'draft',
    });

    expect(data).toMatchObject({
      name: 'test',
      categories: { connect: [{ id: 'doc1-en-draft', position: { before: 'doc2-en-draft' } }] },
      category: { connect: [{ id: 'doc4-en-draft' }] },
    });
  });

  it('Connect after', async () => {
    const { data } = await transformParamsDocumentId(PRODUCT_UID, {
      data: {
        name: 'test',
        categories: { connect: [{ documentId: 'doc1', position: { after: 'doc2' } }] },
        category: { connect: 'doc4' },
      },
      locale: 'en',
      status: 'draft',
    });

    expect(data).toMatchObject({
      name: 'test',
      categories: { connect: [{ id: 'doc1-en-draft', position: { after: 'doc2-en-draft' } }] },
      category: { connect: [{ id: 'doc4-en-draft' }] },
    });
  });

  it('Disconnect', async () => {
    const { data } = await transformParamsDocumentId(PRODUCT_UID, {
      data: {
        name: 'test',
        categories: { disconnect: ['doc1', 'doc2', 'doc3'] },
        category: { disconnect: 'doc4' },
      },
      locale: 'en',
      status: 'draft',
    });

    expect(data).toMatchObject({
      name: 'test',
      categories: {
        disconnect: [{ id: 'doc1-en-draft' }, { id: 'doc2-en-draft' }, { id: 'doc3-en-draft' }],
      },
      category: { disconnect: [{ id: 'doc4-en-draft' }] },
    });
  });

  it('Multiple', async () => {
    const { data } = await transformParamsDocumentId(PRODUCT_UID, {
      data: {
        name: 'test',
        categories: {
          set: ['doc1', 'doc2', 'doc3'],
          connect: ['doc4', 'doc5'],
          disconnect: ['doc6', 'doc7'],
        },
        category: {
          set: 'doc8',
          connect: 'doc9',
          disconnect: 'doc10',
        },
      },
      locale: 'en',
      status: 'draft',
    });

    expect(data).toMatchObject({
      name: 'test',
      categories: {
        set: [{ id: 'doc1-en-draft' }, { id: 'doc2-en-draft' }, { id: 'doc3-en-draft' }],
        connect: [{ id: 'doc4-en-draft' }, { id: 'doc5-en-draft' }],
        disconnect: [{ id: 'doc6-en-draft' }, { id: 'doc7-en-draft' }],
      },
      category: {
        set: [{ id: 'doc8-en-draft' }],
        connect: [{ id: 'doc9-en-draft' }],
        disconnect: [{ id: 'doc10-en-draft' }],
      },
    });
  });
});
