'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');
const { createAuthRequest } = require('api-tests/request');
const { testInTransaction } = require('../../../utils');

const builder = createTestBuilder();
let strapi;
let formatDocument;

const PRODUCT_UID = 'api::product.product';

const featuresCompo = {
  displayName: 'features',
  attributes: {
    name: {
      type: 'string',
      required: true,
    },
    description: {
      type: 'text',
      minLength: 4,
      maxLength: 100,
    },
    slogan: {
      type: 'string',
    },
  },
};

const product = {
  attributes: {
    name: {
      type: 'string',
      required: true,
    },
    // The schema contains different types of fields that require validation
    // This is to ensure that when we request metadata for these documents
    // that the available locales contain data for any fields that require
    // validation. In order ti enable error states in bulk action UI modals
    category: {
      type: 'string',
      maxLength: 10,
    },
    price: {
      type: 'integer',
      max: 10,
    },
    features: {
      required: true,
      type: 'component',
      repeatable: false,
      component: 'default.features',
    },
    // TODO - Add other fields with validation requirements
    shopName: {
      // This field has no validation requirements so should be expluded from
      // available locales
      type: 'string',
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
  let rq;
  const extraLocaleCode = 'fr';

  beforeAll(async () => {
    await builder.addComponent(featuresCompo).addContentType(product).build();

    strapi = await createStrapiInstance();
    formatDocument = (...props) =>
      strapi
        .plugin('content-manager')
        .service('document-metadata')
        .formatDocumentWithMetadata(...props);

    rq = await createAuthRequest({ strapi });

    await rq({
      method: 'POST',
      url: '/i18n/locales',
      body: {
        code: extraLocaleCode,
        name: `Locale name: (${extraLocaleCode})`,
        isDefault: false,
      },
    });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  testInTransaction('Returns empty metadata when there is only a draft', async () => {
    await createProduct('product', 'en', 'draft');

    const product = await getProduct('product');
    const { data, meta } = await formatDocument(PRODUCT_UID, product, {});

    expect(data.status).toBe('draft');
    expect(meta.availableLocales).toEqual([]);
    expect(meta.availableStatus).toEqual([]);
  });

  testInTransaction('Returns availableStatus when draft has a published version', async () => {
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
  });

  testInTransaction(
    'Returns availableStatus when published version has a draft version',
    async () => {
      await createProduct('product', 'en', 'draft');
      await createProduct('product', 'en', 'published');

      const draftProduct = await getProduct('product', 'en', 'published');

      const { meta } = await formatDocument(PRODUCT_UID, draftProduct, {});

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
    await createProduct('product', 'en', 'draft');
    await createProduct('product', 'fr', 'draft');

    const draftProduct = await getProduct('product', 'en', 'draft');

    const { meta } = await formatDocument(PRODUCT_UID, draftProduct, {});

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

  // TODO: Modified status
  testInTransaction(
    'Returns modified status when draft is different from published version',
    async () => {
      // Published versions should have different dates
      await createProduct('product', 'en', 'draft');
      await createProduct('product', 'en', 'published', { updatedAt: '2024-02-11' });
      await createProduct('product', 'fr', 'draft');
      await createProduct('product', 'fr', 'published', { updatedAt: '2024-02-11' });

      const draftProduct = await getProduct('product', 'en', 'draft');
      const { data, meta } = await formatDocument(PRODUCT_UID, draftProduct, {});

      expect(data.status).toBe('modified');
      expect(meta.availableLocales).toMatchObject([{ locale: 'fr', status: 'modified' }]);
      // expect(meta.availableStatus).toMatchObject([{ status: 'modified' }]);

      const publishedProduct = await getProduct('product', 'en', 'published');
      const { data: dataPublished, meta: metaPublished } = await formatDocument(
        PRODUCT_UID,
        publishedProduct,
        {}
      );

      expect(dataPublished.status).toBe('modified');
      expect(metaPublished.availableLocales).toMatchObject([{ locale: 'fr', status: 'modified' }]);
    }
  );

  test('Return available locales, including any fields that require validation', async () => {
    const wantedKeys = {
      category: {
        expectation: expect.any(String),
        getDefaultValue: (locale) => `Cat-1-${locale}`,
      },
      price: {
        expectation: expect.any(Number),
        getDefaultValue: () => 1,
      },
      features: {
        expectation: expect.any(Object),
        getDefaultValue: (locale) => ({
          name: `Feature 1 ${locale}`,
          description: 'Description 1',
          slogan: 'Slogan 1',
        }),
      },
      createdAt: {
        expectation: expect.any(String),
      },
      updatedAt: {
        expectation: expect.any(String),
      },
      name: {
        expectation: expect.any(String),
      },
    };

    const unWantedKeys = {
      // These fields have no validation requirements
      // We will check that they are not included in the available locales response
      shopName: {
        expectation: expect.any(String),
        getDefaultValue: (locale) => `BuyMyStuff-${locale}`,
      },
    };

    const getExtraContent = (locale) => {
      return {
        ...Object.entries({ ...wantedKeys, ...unWantedKeys }).reduce(
          (acc, [key, { getDefaultValue }]) => {
            if (getDefaultValue === undefined) {
              // If there is no default value function, do not include the key
              return acc;
            }

            return { ...acc, [key]: getDefaultValue(locale) };
          },
          {}
        ),
      };
    };

    // Create products with different locales with content for every kind of
    // field that requires validation
    const defaultLocaleProduct = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${PRODUCT_UID}`,
      body: {
        name: `prod-en-draft`,
        ...getExtraContent('en'),
      },
    });
    const documentId = defaultLocaleProduct.body.data.documentId;

    await rq({
      method: 'PUT',
      url: `/content-manager/collection-types/${PRODUCT_UID}/${documentId}`,
      body: {
        name: `prod-${extraLocaleCode}-draft`,
        ...getExtraContent(extraLocaleCode),
      },
      qs: { locale: extraLocaleCode },
    });

    const draftProduct = await getProduct(documentId, 'en', 'draft');
    const { meta } = await formatDocument(PRODUCT_UID, draftProduct, {});

    expect(meta.availableLocales).toEqual(
      expect.arrayContaining([
        expect.objectContaining(
          Object.keys(wantedKeys).reduce(
            (acc, key) => ({ ...acc, [key]: wantedKeys[key].expectation }),
            {}
          )
        ),
      ])
    );

    expect(meta.availableLocales).toEqual(
      expect.arrayContaining([
        expect.not.objectContaining(
          Object.keys(unWantedKeys).reduce(
            (acc, key) => ({ ...acc, [key]: unWantedKeys[key].expectation }),
            {}
          )
        ),
      ])
    );

    expect(meta.availableStatus).toEqual([]);
  });

  test('Does not return any sensitive information in the available status', async () => {
    const prefix = 'product-sensitive-info-test';
    const defaultLocaleProduct = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${PRODUCT_UID}`,
      body: {
        name: `${prefix}-en-draft`,
        features: {
          name: `${prefix} Feature 1`,
          description: `${prefix} Description 1`,
          slogan: `${prefix} Slogan 1`,
        },
      },
    });
    const documentId = defaultLocaleProduct.body.data.documentId;

    await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${PRODUCT_UID}/${documentId}/actions/publish`,
      body: {},
    });

    const publishedProduct = await getProduct(documentId, 'en', 'published');
    const { data, meta } = await formatDocument(PRODUCT_UID, publishedProduct, {});

    expect(data.status).toBe('published');

    expect(meta.availableStatus.length).toEqual(1);
    expect(meta.availableStatus[0].createdBy?.password).toBeUndefined();
    expect(meta.availableStatus[0].undatedBy?.password).toBeUndefined();
  });
});
