'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');
const { createAuthRequest } = require('api-tests/request');
const { testInTransaction } = require('../../../utils');

const builder = createTestBuilder();
let strapi;
let formatDocument;
let rq;

const PRODUCT_UID = 'api::product.product';

const product = {
  attributes: {
    name: {
      type: 'string',
      required: true,
    },
  },
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  displayName: 'Product',
  singularName: 'product',
  pluralName: 'products',
  description: '',
  collectionName: '',
};

const createProduct = async (id, locale, status, data = {}) => {
  await strapi.db.query(PRODUCT_UID).create({
    data: {
      documentId: id,
      name: `prod-${id}-${locale}-${status}`,
      locale,
      publishedAt: status === 'published' ? '2024-02-16' : null,
      ...data,
    },
  });
};

const getProduct = async (name, locale, status) => {
  return strapi.documents(PRODUCT_UID).findFirst({ filter: { name }, locale, status });
};

describe('CM API - Document metadata', () => {
  beforeAll(async () => {
    await builder.addContentType(product).build();

    strapi = await createStrapiInstance();
    formatDocument = (...props) =>
      strapi
        .plugin('content-manager')
        .service('document-metadata')
        .formatDocumentWithMetadata(...props);

    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  it(
    'Returns empty metadata when there is only a draft',
    testInTransaction(async () => {
      await createProduct('product', 'en', 'draft');

      const product = await getProduct('product');
      const { data, meta } = await formatDocument(PRODUCT_UID, product, {});

      expect(data.status).toBe('draft');
      expect(meta.availableLocales).toEqual([]);
      expect(meta.availableStatus).toEqual([]);
    })
  );

  it(
    'Returns availableStatus when draft has a published version',
    testInTransaction(async () => {
      await createProduct('product', 'en', 'draft');
      await createProduct('product', 'en', 'published');

      const draftProduct = await getProduct('product', 'en', 'draft');

      const { data, meta } = await formatDocument(PRODUCT_UID, draftProduct, {});

      expect(data.status).toBe('published');
      expect(meta.availableLocales).toEqual([]);
      expect(meta.availableStatus).toMatchObject([
        {
          locale: 'en',
          publishedAt: expect.any(String),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          createdBy: expect.any(Object),
          updatedBy: expect.any(Object),
          // TODO
          // status: 'published',
        },
      ]);
    })
  );

  it(
    'Returns availableStatus when published version has a draft version',
    testInTransaction(async () => {
      await createProduct('product', 'en', 'draft');
      await createProduct('product', 'en', 'published');

      const draftProduct = await getProduct('product', 'en', 'published');

      const { data, meta } = await formatDocument(PRODUCT_UID, draftProduct, {});

      expect(meta.availableLocales).toEqual([]);
      expect(meta.availableStatus).toMatchObject([
        {
          locale: 'en',
          publishedAt: null,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          createdBy: expect.any(Object),
          updatedBy: expect.any(Object),
          // TODO
          // status: 'published',
        },
      ]);
    })
  );

  it(
    'Returns available locales when there are multiple locales',
    testInTransaction(async () => {
      await createProduct('product', 'en', 'draft');
      await createProduct('product', 'fr', 'draft');

      const draftProduct = await getProduct('product', 'en', 'draft');

      const { data, meta } = await formatDocument(PRODUCT_UID, draftProduct, {});

      expect(meta.availableLocales).toMatchObject([
        {
          locale: 'fr',
          status: 'draft',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      ]);
      expect(meta.availableStatus).toEqual([]);
    })
  );

  //TODO:  Modified status
  it(
    'Returns modified status when draft is different from published version',
    testInTransaction(async () => {
      // Published versions should have different dates
      await createProduct('product', 'en', 'draft');
      await createProduct('product', 'en', 'published', { updatedAt: '2024-02-11' });
      await createProduct('product', 'fr', 'draft');
      await createProduct('product', 'fr', 'published', { updatedAt: '2024-02-11' });

      const draftProduct = await getProduct('product', 'en', 'draft');

      const { data, meta } = await formatDocument(PRODUCT_UID, draftProduct, {});

      expect(data.status).toBe('modified');
      expect(meta.availableLocales).toMatchObject([{ locale: 'fr', status: 'modified' }]);
      // expect(meta.availableStatus).toMatchObject([
      //   {
      //     status: 'modified',
      //   },
      // ]);
    })
  );
});
