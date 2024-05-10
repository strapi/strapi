'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');
const { testInTransaction } = require('../../../utils');

const builder = createTestBuilder();
let strapi;
let formatDocument;

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
  draftAndPublish: true,
  displayName: 'Product',
  singularName: 'product',
  pluralName: 'products',
  description: '',
  collectionName: '',
};

const getProduct = async (documentId, locale, status) => {
  return strapi.documents(PRODUCT_UID).findOne({ documentId, locale, status });
};

const createProduct = async (identifier, locale, status) => {
  return strapi.documents(PRODUCT_UID).create({
    data: {
      name: `prod-${identifier}-${locale}-${status}`,
      features: {
        name: `${identifier}-Feature1-${locale}`,
        description: `${identifier}-Description1`,
        slogan: `${identifier}-Slogan1`,
      },
    },
  });
};

const createProductLocale = async (documentId, locale, status) => {
  return strapi.documents(PRODUCT_UID).update({
    documentId,
    locale,
    data: {
      name: `prod-${locale}-${status}`,
      features: {
        name: `Feature1-${locale}`,
        description: `Description1-${locale}`,
        slogan: `Slogan1-${locale}`,
      },
    },
  });
};

const createProductQuery = async (id, locale, status, data = {}) => {
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

describe('CM API - Document metadata', () => {
  beforeAll(async () => {
    await builder.addContentType(product).build();

    strapi = await createStrapiInstance();
    formatDocument = (...props) =>
      strapi
        .plugin('content-manager')
        .service('document-metadata')
        .formatDocumentWithMetadata(...props);
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  testInTransaction('Returns empty metadata when there is only a draft', async () => {
    const identifier = 'product-empty-metadata';
    const { documentId } = await createProduct(identifier, 'en', 'draft');

    const product = await getProduct(documentId);
    const { data, meta } = await formatDocument(PRODUCT_UID, product, {});

    expect(data.status).toBe('draft');
    expect(meta.availableLocales).toEqual([]);
    expect(meta.availableStatus).toEqual([]);
  });

  testInTransaction('Returns availableStatus when draft has a published version', async () => {
    const identifier = 'product-available-status';

    const draftProduct = await createProduct(identifier, 'en', 'draft');

    await strapi.documents(PRODUCT_UID).publish(draftProduct);

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
  });

  testInTransaction(
    'Returns availableStatus when published version has a draft version',
    async () => {
      const identifier = 'product-available-status-published';
      const draftProduct = await createProduct(identifier, 'en', 'draft');
      const publishedProduct = (
        await strapi.documents(PRODUCT_UID).publish(draftProduct)
      ).entries.at(0);

      const { meta } = await formatDocument(PRODUCT_UID, publishedProduct, {});

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
    }
  );

  testInTransaction('Returns available locales when there are multiple locales', async () => {
    const identifier = 'product-available-locales';
    const defaultLocaleDocument = await createProduct(identifier, 'en', 'draft');

    const { documentId } = defaultLocaleDocument;
    await createProductLocale(documentId, 'fr', 'draft');

    const { meta } = await formatDocument(PRODUCT_UID, defaultLocaleDocument, {});

    expect(meta.availableLocales).toMatchObject([
      {
        locale: 'fr',
        status: 'draft',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
    ]);
    expect(meta.availableStatus).toEqual([]);
  });

  testInTransaction(
    'Returns modified status when draft is different from published version',
    async () => {
      // Published versions should have different dates
      // We use the DB query layer here so we have control over the dates
      const documentId = 'product-modified-status';
      await createProductQuery(documentId, 'en', 'draft');
      await createProductQuery(documentId, 'en', 'published', { updatedAt: '2024-02-11' });
      await createProductQuery(documentId, 'fr', 'draft');
      await createProductQuery(documentId, 'fr', 'published', { updatedAt: '2024-02-11' });

      const draftProduct = await getProduct(documentId, 'en', 'draft');
      const { data, meta } = await formatDocument(PRODUCT_UID, draftProduct, {});

      expect(data.status).toBe('modified');
      expect(meta.availableLocales).toMatchObject([{ locale: 'fr', status: 'modified' }]);
      // expect(meta.availableStatus).toMatchObject([{ status: 'modified' }]);

      const publishedProduct = await getProduct(documentId, 'en', 'published');
      const { data: dataPublished, meta: metaPublished } = await formatDocument(
        PRODUCT_UID,
        publishedProduct,
        {}
      );

      expect(dataPublished.status).toBe('modified');
      expect(metaPublished.availableLocales).toMatchObject([{ locale: 'fr', status: 'modified' }]);
    }
  );
});
