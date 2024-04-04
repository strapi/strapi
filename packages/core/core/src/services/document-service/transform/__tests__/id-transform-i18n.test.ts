import { PRODUCT_UID, CATEGORY_UID, models } from './utils';
import { transformParamsDocumentId } from '../id-transform';

const findProducts = jest.fn(() => ({}));
const findCategories = jest.fn(() => ({}));

const findManyQueries = {
  [PRODUCT_UID]: findProducts,
  [CATEGORY_UID]: findCategories,
} as Record<string, jest.Mock>;

// TODO: Relation between published documents
describe('Transform relational data', () => {
  global.strapi = {
    getModel: (uid: string) => models[uid],
    plugins: {
      i18n: {
        services: {
          'content-types': {
            isLocalizedContentType(model: any) {
              // Localize category content type
              if (model.uid === CATEGORY_UID) {
                return true;
              }
              // Shop is not localized
              return false;
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
    findCategories.mockReturnValue([
      { id: 'category-1-en-draft', documentId: 'category-1', locale: 'en', publishedAt: null },
      { id: 'category-1-fr-draft', documentId: 'category-1', locale: 'fr', publishedAt: null },
      { id: 'category-2-en-draft', documentId: 'category-2', locale: 'en', publishedAt: null },
      { id: 'category-3-en-draft', documentId: 'category-3', locale: 'en', publishedAt: null },
      { id: 'category-4-en-draft', documentId: 'category-4', locale: 'en', publishedAt: null },
      { id: 'category-5-en-draft', documentId: 'category-5', locale: 'en', publishedAt: null },
      { id: 'category-6-en-draft', documentId: 'category-6', locale: 'en', publishedAt: null },
      { id: 'category-7-en-draft', documentId: 'category-7', locale: 'en', publishedAt: null },
      { id: 'category-8-en-draft', documentId: 'category-8', locale: 'en', publishedAt: null },
      { id: 'category-9-en-draft', documentId: 'category-9', locale: 'en', publishedAt: null },
      { id: 'category-10-en-draft', documentId: 'category-10', locale: 'en', publishedAt: null },
    ]);

    findProducts.mockReturnValue([
      { id: 'product-1-draft', documentId: 'product-1', locale: null, publishedAt: null },
      { id: 'product-1-published', documentId: 'product-1', locale: null, publishedAt: new Date() },
      { id: 'product-2-draft', documentId: 'product-2', locale: null, publishedAt: null },
      { id: 'product-3-draft', documentId: 'product-3', locale: null, publishedAt: null },
    ]);
  });

  describe('Non I18n (products) -> I18n (categories)', () => {
    it('Connect to locales of the same category document', async () => {
      const { data } = await transformParamsDocumentId(PRODUCT_UID, {
        data: {
          name: 'test',
          categories: [
            { documentId: 'category-1', locale: 'en' },
            { documentId: 'category-1', locale: 'fr' },
            { documentId: 'category-2', locale: 'en' },
          ],
          category: { documentId: 'category-4', locale: 'en' },
          relatedProducts: [{ documentId: 'product-1' }, { documentId: 'product-2', locale: null }],
        },
        locale: 'en',
        status: 'draft',
      });

      expect(data).toMatchObject({
        name: 'test',
        categories: {
          set: [
            { id: 'category-1-en-draft' },
            { id: 'category-1-fr-draft' },
            { id: 'category-2-en-draft' },
          ],
        },
        category: { set: [{ id: 'category-4-en-draft' }] },
        relatedProducts: { set: [{ id: 'product-1-draft' }, { id: 'product-2-draft' }] },
      });
    });

    it('Connect to the default locale if not provided', async () => {
      // Should connect to the default locale if not provided in the relation
      const { data } = await transformParamsDocumentId(PRODUCT_UID, {
        data: {
          name: 'test',
          categories: [{ documentId: 'category-1' }],
        },
        status: 'draft',
      });

      expect(data).toMatchObject({
        name: 'test',
        categories: { set: [{ id: 'category-1-en-draft' }] },
      });
    });

    it('Connect and reorder', async () => {
      // Should connect and reorder the relations,
      const { data } = await transformParamsDocumentId(PRODUCT_UID, {
        data: {
          name: 'test',
          categories: {
            connect: [
              {
                documentId: 'category-1',
                locale: 'fr',
                position: { before: 'category-2', locale: 'en' },
              },
              {
                documentId: 'category-2',
                locale: 'en',
                position: { after: 'category-1', locale: 'fr' },
              },
            ],
          },
        },
        status: 'draft',
      });

      expect(data).toMatchObject({
        name: 'test',
        categories: {
          connect: [
            { id: 'category-1-fr-draft', position: { before: 'category-2-en-draft' } },
            { id: 'category-2-en-draft', position: { after: 'category-1-fr-draft' } },
          ],
        },
      });
    });
  });

  describe('I18n (categories) -> Non I18n (products)', () => {
    it('Ignore locale when connecting to non localized content type', async () => {
      // Should ignore the locale when connecting to non localized content type
      const { data } = await transformParamsDocumentId(CATEGORY_UID, {
        data: {
          products: [{ documentId: 'product-1' }, { documentId: 'product-2', locale: 'en' }],
        },
        locale: 'en',
        status: 'draft',
      });

      expect(data).toMatchObject({
        products: { set: [{ id: 'product-1-draft' }, { id: 'product-2-draft' }] },
      });
    });
  });

  describe('I18n (categories) -> I18n (categories)', () => {
    it('Connect to source locale if not provided', async () => {
      // Should connect to the source locale if not provided in the relation
      const { data } = await transformParamsDocumentId(CATEGORY_UID, {
        data: {
          relatedCategories: [{ documentId: 'category-1' }],
        },
        locale: 'fr',
        status: 'draft',
      });

      expect(data).toMatchObject({
        relatedCategories: { set: [{ id: 'category-1-fr-draft' }] },
      });
    });

    it("Connect to source locale if the locale of the relation doesn't match", async () => {
      // Should not be able to connect to different locales than the current one
      const { data } = await transformParamsDocumentId(CATEGORY_UID, {
        data: {
          // Connect to another locale than the current one
          relatedCategories: [{ documentId: 'category-1', locale: 'fr' }],
        },
        locale: 'en',
        status: 'draft',
      });

      expect(data).toMatchObject({
        relatedCategories: {
          set: [{ id: 'category-1-en-draft' }],
        },
      });
    });
  });
});
