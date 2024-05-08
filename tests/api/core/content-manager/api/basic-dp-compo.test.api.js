'use strict';

// Test a simple default API with no relations

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const { async } = require('@strapi/utils');

const builder = createTestBuilder();
let strapi;
let rq;
const data = {
  productsWithCompoAndDP: [],
};

const compo = {
  displayName: 'compo',
  attributes: {
    name: {
      type: 'string',
      required: true,
    },
    description: {
      type: 'text',
      minLength: 4,
      maxLength: 30,
    },
  },
};

const productWithCompoAndDP = {
  attributes: {
    name: {
      type: 'string',
    },
    description: {
      type: 'text',
    },
    compo: {
      type: 'component',
      component: 'default.compo',
      required: true,
    },
  },
  draftAndPublish: true,
  displayName: 'product with compo and DP',
  singularName: 'product-with-compo-and-dp',
  pluralName: 'product-with-compo-and-dps',
  description: '',
  collectionName: '',
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
};

const extraLocales = ['fr', 'it', 'es'];

describe('CM API - Basic + compo', () => {
  beforeAll(async () => {
    await builder.addComponent(compo).addContentType(productWithCompoAndDP).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    // Create new locales
    for (const extraLocale of extraLocales) {
      await rq({
        method: 'POST',
        url: '/i18n/locales',
        body: {
          code: extraLocale,
          name: `Locale name: (${extraLocale})`,
          isDefault: false,
        },
      });
    }
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Create product with compo', async () => {
    const product = {
      name: 'Product 1',
      description: 'Product description',
      compo: {
        name: 'compo name',
        description: 'short',
      },
    };
    const res = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::product-with-compo-and-dp.product-with-compo-and-dp',
      body: product,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toMatchObject(product);
    expect(res.body.data.publishedAt).toBeNull();
    data.productsWithCompoAndDP.push(res.body.data);
  });

  test('Read product with compo', async () => {
    const res = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/api::product-with-compo-and-dp.product-with-compo-and-dp/${data.productsWithCompoAndDP[0].documentId}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject(data.productsWithCompoAndDP[0]);
    expect(res.body.data.publishedAt).toBeNull();
  });

  test('Update product with compo', async () => {
    const product = {
      name: 'Product 1 updated',
      description: 'Updated Product description',
      compo: {
        name: 'compo name updated',
        description: 'update',
      },
    };
    const res = await rq({
      method: 'PUT',
      url: `/content-manager/collection-types/api::product-with-compo-and-dp.product-with-compo-and-dp/${data.productsWithCompoAndDP[0].documentId}`,
      body: product,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject(product);
    expect(res.body.data.documentId).toEqual(data.productsWithCompoAndDP[0].documentId);
    expect(res.body.data.publishedAt).toBeNull();
    data.productsWithCompoAndDP[0] = res.body.data;
  });

  test('Delete product with compo', async () => {
    const res = await rq({
      method: 'DELETE',
      url: `/content-manager/collection-types/api::product-with-compo-and-dp.product-with-compo-and-dp/${data.productsWithCompoAndDP[0].documentId}`,
    });

    expect(res.statusCode).toBe(200);
    data.productsWithCompoAndDP.shift();
  });

  describe('validation', () => {
    test('Can create product with compo - compo required', async () => {
      const product = {
        name: 'Product 1',
        description: 'Product description',
        compo: null,
      };
      const res = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::product-with-compo-and-dp.product-with-compo-and-dp',
        body: product,
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.data).toMatchObject(product);
      data.productsWithCompoAndDP.push(res.body.data);
    });

    test('Can create product with compo - minLength', async () => {
      const product = {
        name: 'Product 1',
        description: 'Product description',
        compo: {
          name: 'compo name',
          description: '',
        },
      };
      const res = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::product-with-compo-and-dp.product-with-compo-and-dp',
        body: product,
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.data).toMatchObject(product);
      data.productsWithCompoAndDP.push(res.body.data);
    });

    test('Cannot create product with compo - maxLength', async () => {
      const product = {
        name: 'Product 1',
        description: 'Product description',
        compo: {
          name: 'compo name',
          description: 'A very long description that exceed the min length.',
        },
      };
      const res = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::product-with-compo-and-dp.product-with-compo-and-dp',
        body: product,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        data: null,
        error: {
          status: 400,
          name: 'ValidationError',
          message: 'compo.description must be at most 30 characters',
          details: {
            errors: [
              {
                path: ['compo', 'description'],
                message: 'compo.description must be at most 30 characters',
                name: 'ValidationError',
              },
            ],
          },
        },
      });
    });

    test('Can create product with compo - required', async () => {
      const product = {
        name: 'Product 1',
        description: 'Product description',
        compo: {
          description: 'short',
        },
      };
      const res = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::product-with-compo-and-dp.product-with-compo-and-dp',
        body: product,
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.data).toMatchObject(product);
      data.productsWithCompoAndDP.push(res.body.data);
    });
  });

  describe('Publication', () => {
    test('Can publish product with compo - required', async () => {
      const product = {
        name: 'Product 1',
        description: 'Product description',
        compo: {
          name: 'compo name',
          description: 'short',
        },
      };
      const res = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::product-with-compo-and-dp.product-with-compo-and-dp',
        body: product,
      });

      const publishRes = await rq({
        method: 'POST',
        url: `/content-manager/collection-types/api::product-with-compo-and-dp.product-with-compo-and-dp/${res.body.data.documentId}/actions/publish`,
        body: product,
      });

      expect(publishRes.statusCode).toBe(200);
      // TODO: Validate document is published
    });

    test('Can bulk publish product with compo - required', async () => {
      const product1 = {
        name: 'Product 1',
        description: 'Product description',
        compo: {
          name: 'compo name',
          description: 'short',
        },
      };

      const product2 = {
        name: 'Product 2',
        description: 'Product description',
        compo: {
          name: 'compo name',
          description: 'short',
        },
      };

      const {
        body: {
          data: { documentId: documentId1 },
        },
      } = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::product-with-compo-and-dp.product-with-compo-and-dp',
        body: product1,
      });

      const {
        body: {
          data: { documentId: documentId2 },
        },
      } = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::product-with-compo-and-dp.product-with-compo-and-dp',
        body: product2,
      });

      const publishRes = await rq({
        method: 'POST',
        url: `/content-manager/collection-types/api::product-with-compo-and-dp.product-with-compo-and-dp/actions/bulkPublish`,
        body: {
          documentIds: [documentId1, documentId2],
        },
      });

      expect(publishRes.statusCode).toBe(200);
      expect(publishRes.body).toMatchObject({ count: 2 });
    });

    test('BulkPublish across multiple documents and locales', async () => {
      // Create multiple documents in the default locales
      const numberOfDocuments = 5;
      const defaultDocuments = {};
      for (let i = 0; i < numberOfDocuments; i += 1) {
        const product = {
          name: `Product ${i}`,
          description: `Product description ${i}`,
          compo: {
            name: `compo name ${i}`,
            description: `short ${i}`,
          },
        };

        const {
          body: {
            data: { documentId },
          },
        } = await rq({
          method: 'POST',
          url: '/content-manager/collection-types/api::product-with-compo-and-dp.product-with-compo-and-dp',
          body: product,
        });

        defaultDocuments[documentId] = product;
      }

      // Add extra locales to each document
      await async.map(Object.entries(defaultDocuments), async ([documentId, product]) => {
        await async.map(extraLocales, async (locale) => {
          await rq({
            method: 'PUT',
            url: `/content-manager/collection-types/api::product-with-compo-and-dp.product-with-compo-and-dp/${documentId}`,
            body: {
              name: `Product ${product.name} ${locale}`,
              compo: {
                name: `compo name ${product.compo.name} ${locale}`,
                description: `short ${product.compo.description} ${locale}`,
              },
            },
            qs: {
              locale,
            },
          });
        });
      });

      // Bulk publish all the documents
      const bulkPublishRes = await rq({
        method: 'POST',
        url: `/content-manager/collection-types/api::product-with-compo-and-dp.product-with-compo-and-dp/actions/bulkPublish`,
        body: {
          documentIds: Object.keys(defaultDocuments),
        },
        qs: {
          locale: ['en', ...extraLocales],
        },
      });

      expect(bulkPublishRes.statusCode).toBe(200);
      expect(bulkPublishRes.body).toMatchObject({
        count: numberOfDocuments * (extraLocales.length + 1),
      });
      // TODO verify that all the drafts are still there
    });
  });
});
