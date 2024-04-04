import { PRODUCT_UID, SHOP_UID, models } from './utils';
import { transformParamsDocumentId } from '../id-transform';

const findProducts = jest.fn(() => ({}));
const findShops = jest.fn(() => ({}));

const findManyQueries = {
  [PRODUCT_UID]: findProducts,
  [SHOP_UID]: findShops,
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
  } as any;

  beforeEach(() => {
    findShops.mockReturnValue([
      { id: 'shop-1-en', documentId: 'shop-1', locale: 'en' },
      { id: 'shop-1-fr', documentId: 'shop-1', locale: 'fr' },
      { id: 'shop-2-en', documentId: 'shop-2', locale: 'en' },
      { id: 'shop-3-en', documentId: 'shop-3', locale: 'en' },
      { id: 'shop-4-en', documentId: 'shop-4', locale: 'en' },
      { id: 'shop-5-en', documentId: 'shop-5', locale: 'en' },
      { id: 'shop-6-en', documentId: 'shop-6', locale: 'en' },
      { id: 'shop-7-en', documentId: 'shop-7', locale: 'en' },
      { id: 'shop-8-en', documentId: 'shop-8', locale: 'en' },
      { id: 'shop-9-en', documentId: 'shop-9', locale: 'en' },
      { id: 'shop-10-en', documentId: 'shop-10', locale: 'en' },
    ]);

    findProducts.mockReturnValue([
      { id: 'product-1-en-draft', documentId: 'product-1', locale: 'en', publishedAt: null },
      {
        id: 'product-1-en-published',
        documentId: 'product-1',
        locale: 'en',
        publishedAt: new Date(),
      },
      { id: 'product-2-en-draft', documentId: 'product-2', locale: 'en', publishedAt: null },
      { id: 'product-3-en-draft', documentId: 'product-3', locale: 'en', publishedAt: null },
    ]);
  });

  describe('Non DP (shop) -> DP (product)', () => {
    it('Connect to multiple status of products', async () => {
      const { data } = await transformParamsDocumentId(SHOP_UID, {
        data: {
          name: 'test',
          products: [
            { documentId: 'product-1', locale: 'en', status: 'published' },
            { documentId: 'product-2', locale: 'en', status: 'draft' },
          ],
          product: { documentId: 'product-1', locale: 'en', status: 'draft' },
        },
        locale: 'en',
        status: 'draft',
      });

      expect(data).toMatchObject({
        name: 'test',
        products: { set: [{ id: 'product-1-en-published' }, { id: 'product-2-en-draft' }] },
        product: { set: [{ id: 'product-1-en-draft' }] },
      });
    });

    it('Connect to to both draft and publish by default', async () => {
      // Should connect to the default locale if not provided in the relation
      const { data } = await transformParamsDocumentId(SHOP_UID, {
        data: {
          name: 'test',
          products: [
            { documentId: 'product-1', locale: 'en' },
            { documentId: 'product-2', locale: 'en' },
          ],
          product: { documentId: 'product-1', locale: 'en' },
        },
        // Should connect to draft versions of the products
        locale: 'en',
        status: 'draft',
      });

      // Transform relations to connect to the draft and published versions of the products
      // If published version is not available, it should connect to the draft version
      expect(data).toMatchObject({
        name: 'test',
        products: {
          set: [
            { id: 'product-1-en-draft' },
            { id: 'product-1-en-published' },
            { id: 'product-2-en-draft' },
          ],
        },
        product: { set: [{ id: 'product-1-en-draft' }, { id: 'product-1-en-published' }] },
      });
    });

    it('Connect and reorder', async () => {
      // Should connect and reorder the relations,
      const { data } = await transformParamsDocumentId(SHOP_UID, {
        data: {
          name: 'test',
          products: {
            connect: [
              {
                documentId: 'product-1',
                locale: 'en',
                position: { before: 'product-2', locale: 'en' }, // Should expect draft by default
              },
            ],
          },
          product: {
            connect: {
              documentId: 'product-1',
              locale: 'en',
              position: { before: 'product-2', locale: 'en' }, // Should expect draft by default
            },
          },
        },
        status: 'draft',
        locale: 'en',
      });

      expect(data).toMatchObject({
        name: 'test',
        products: {
          connect: [
            { id: 'product-1-en-draft', position: { before: 'product-2-en-draft' } },
            { id: 'product-1-en-published', position: { before: 'product-2-en-draft' } },
          ],
        },
        product: {
          connect: [
            { id: 'product-1-en-draft', position: { before: 'product-2-en-draft' } },
            { id: 'product-1-en-published', position: { before: 'product-2-en-draft' } },
          ],
        },
      });
    });
  });
});
