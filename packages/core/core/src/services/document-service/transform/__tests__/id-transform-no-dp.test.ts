import { LoadedStrapi } from '@strapi/types';
import { PRODUCT_UID, SHOP_UID, models } from './utils';
import { transformParamsDocumentId } from '../id-transform';

const findProducts = jest.fn(() => ({}));
const findShops = jest.fn(() => ({}));

const findManyQueries = {
  [PRODUCT_UID]: findProducts,
  [SHOP_UID]: findShops,
} as Record<string, jest.Mock>;

// TODO: Relation between published documents
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
        },
      },
    },
    db: {
      query: jest.fn((uid) => ({ findMany: findManyQueries[uid] })),
    },
  } as unknown as LoadedStrapi;

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
      const { data } = await transformParamsDocumentId(
        SHOP_UID,
        {
          data: {
            name: 'test',
            products: [
              { documentId: 'product-1', locale: 'en', status: 'published' },
              { documentId: 'product-2', locale: 'en', status: 'draft' },
            ],
            product: { documentId: 'product-1', locale: 'en', status: 'draft' },
          },
        },
        { locale: 'en', isDraft: true }
      );

      expect(data).toMatchObject({
        name: 'test',
        products: [{ id: 'product-1-en-published' }, { id: 'product-2-en-draft' }],
        product: { id: 'product-1-en-draft' },
      });
    });

    it('Connect to the root status', async () => {
      // Should connect to the default locale if not provided in the relation
      const { data } = await transformParamsDocumentId(
        SHOP_UID,
        {
          data: {
            name: 'test',
            products: [
              { documentId: 'product-1', locale: 'en' },
              { documentId: 'product-2', locale: 'en' },
            ],
            product: { documentId: 'product-1', locale: 'en' },
          },
        },
        // Should connect to draft versions of the products
        { locale: 'en', isDraft: true }
      );

      expect(data).toMatchObject({
        name: 'test',
        products: [{ id: 'product-1-en-draft' }, { id: 'product-2-en-draft' }],
        product: { id: 'product-1-en-draft' },
      });

      // Should connect to published versions of the products
      const { data: publishedData } = await transformParamsDocumentId(
        SHOP_UID,
        {
          data: {
            name: 'test',
            products: [
              { documentId: 'product-1', locale: 'en' },
              { documentId: 'product-2', locale: 'en' },
            ],
            product: { documentId: 'product-2', locale: 'en' },
          },
        },
        // Should connect to published versions of the products
        { locale: 'en', isDraft: false, allowMissingId: true }
      );

      expect(publishedData).toMatchObject({
        name: 'test',
        products: [{ id: 'product-1-en-published' }],
        product: null,
      });
    });

    it('Connect to draft by default', async () => {
      // Should connect to the default locale if not provided in the relation
      const { data } = await transformParamsDocumentId(
        SHOP_UID,
        {
          data: {
            name: 'test',
            products: [
              { documentId: 'product-1', locale: 'en' },
              { documentId: 'product-2', locale: 'en' },
            ],
            product: { documentId: 'product-1', locale: 'en' },
          },
        },
        // Should connect to draft versions of the products
        { locale: 'en' }
      );

      expect(data).toMatchObject({
        name: 'test',
        products: [{ id: 'product-1-en-draft' }, { id: 'product-2-en-draft' }],
        product: { id: 'product-1-en-draft' },
      });
    });
  });

  describe('DP (product) -> Non DP (shop)', () => {
    it('Ignore locale when connecting to non localized content type', async () => {
      // Should ignore the locale when connecting to non localized content type
      const { data } = await transformParamsDocumentId(
        CATEGORY_UID,
        {
          data: {
            products: [{ documentId: 'product-1' }, { documentId: 'product-2', locale: 'en' }],
          },
        },
        { locale: 'en', isDraft: true }
      );

      expect(data).toMatchObject({
        products: [{ id: 'product-1-draft' }, { id: 'product-2-draft', locale: 'en' }],
      });
    });
  });

  describe('Non DP (shop) -> Non DP (shop)', () => {
    it('Connect to source locale if not provided', async () => {
      // Should connect to the source locale if not provided in the relation
      const { data } = await transformParamsDocumentId(
        CATEGORY_UID,
        {
          data: {
            relatedCategories: [{ documentId: 'category-1' }],
          },
        },
        { locale: 'fr', isDraft: true }
      );

      expect(data).toMatchObject({
        relatedCategories: [{ id: 'category-1-fr-draft' }],
      });
    });

    it('Prevent connecting to invalid locales ', async () => {
      // Should not be able to connect to different locales than the current one
      const promise = transformParamsDocumentId(
        CATEGORY_UID,
        {
          data: {
            // Connect to another locale than the current one
            relatedCategories: [{ documentId: 'category-1', locale: 'fr' }],
          },
        },
        { locale: 'en', isDraft: true }
      );

      expect(promise).rejects.toThrowError();
    });
  });
});
