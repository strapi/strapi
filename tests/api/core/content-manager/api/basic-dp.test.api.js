'use strict';

const _ = require('lodash');

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;
const data = {
  productsWithDP: [],
};

const productWithDP = {
  attributes: {
    name: {
      type: 'string',
      required: true,
    },
    description: {
      type: 'text',
      minLength: 3,
      maxLength: 30,
    },
  },
  draftAndPublish: true,
  displayName: 'product with DP',
  singularName: 'product-with-dp',
  pluralName: 'product-with-dps',
  description: '',
  collectionName: '',
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

// TODO: V5 - Test publish with locale
describe('CM API - Basic', () => {
  beforeAll(async () => {
    await builder.addComponent(compo).addContentType(productWithDP).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Create a product', async () => {
    const product = {
      name: 'Product 1',
      description: 'Product description',
    };
    const res = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::product-with-dp.product-with-dp',
      body: product,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toMatchObject(product);
    expect(res.body.data.publishedAt).toBeNull();
    data.productsWithDP.push(res.body.data);
  });

  test('Create a product + cannot overwrite publishedAt', async () => {
    const product = {
      name: 'Product 2',
      description: 'Product description',
      publishedAt: '2020-08-20T10:27:55.866Z',
    };
    const res = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::product-with-dp.product-with-dp',
      body: product,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toMatchObject(_.omit(product, 'publishedAt'));
    expect(res.body.data.publishedAt).toBeNull();
    data.productsWithDP.push(res.body.data);
  });

  test('Read all products', async () => {
    const res = await rq({
      method: 'GET',
      url: '/content-manager/collection-types/api::product-with-dp.product-with-dp',
    });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results).toHaveLength(2);
    expect(res.body.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Product 1',
          description: 'Product description',
        }),
      ])
    );
    res.body.results.forEach((p) => {
      expect(p.publishedAt).toBeNull();
    });
  });

  test('Update a draft', async () => {
    const product = {
      name: 'Product 1 updated',
      description: 'Updated Product description',
    };
    const res = await rq({
      method: 'PUT',
      url: `/content-manager/collection-types/api::product-with-dp.product-with-dp/${data.productsWithDP[0].documentId}`,
      body: product,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject(_.omit(product, 'publishedAt'));
    expect(res.body.data.documentId).toEqual(data.productsWithDP[0].documentId);
    expect(res.body.data.publishedAt).toBeNull();
    data.productsWithDP[0] = res.body.data;
  });

  test('Update product + cannot overwrite publishedAt', async () => {
    const product = {
      name: 'Product 1 updated',
      description: 'Updated Product description',
      publishedAt: '2020-08-27T09:50:50.465Z',
    };
    const res = await rq({
      method: 'PUT',
      url: `/content-manager/collection-types/api::product-with-dp.product-with-dp/${data.productsWithDP[0].documentId}`,
      body: product,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject(_.omit(product, ['publishedAt']));
    expect(res.body.data.publishedAt).toBeNull();
    expect(res.body.data.documentId).toEqual(data.productsWithDP[0].documentId);
    data.productsWithDP[0] = res.body.data;
  });

  // Fix: V5 - Test D&P
  test.skip('Publish a product, expect publishedAt to be defined', async () => {
    const entry = data.productsWithDP[0];
    const product = {
      name: 'Product - Updated',
      description: 'Product description - Updated',
    };

    const { body } = await rq({
      url: `/content-manager/collection-types/api::product-with-dp.product-with-dp/${entry.documentId}/actions/publish`,
      method: 'POST',
      body: product,
    });

    // Get draft and published versions
    const [draftDocument, publishedDocument] = await Promise.all([
      rq({
        method: 'GET',
        url: `/content-manager/collection-types/api::product-with-dp.product-with-dp/${entry.documentId}`,
        qs: { status: 'draft' },
      }),
      rq({
        method: 'GET',
        url: `/content-manager/collection-types/api::product-with-dp.product-with-dp/${entry.documentId}`,
        qs: { status: 'published' },
      }),
    ]);

    data.productsWithDP[0] = body.data;

    // Both draft and published versions should have been updated with the new data
    expect(draftDocument.body.data).toMatchObject(product);
    expect(publishedDocument.body.data).toMatchObject(product);
    expect(body.data.publishedAt).toBeISODate();
  });

  test('Publish and create document, expect both draft and published versions to exist', async () => {
    const product = {
      name: 'Product 3',
      description: 'Product description',
    };

    const { body } = await rq({
      url: `/content-manager/collection-types/api::product-with-dp.product-with-dp/actions/publish`,
      method: 'POST',
      body: product,
    });

    // Get draft and published versions
    const [draftDocument, publishedDocument] = await Promise.all([
      rq({
        method: 'GET',
        url: `/content-manager/collection-types/api::product-with-dp.product-with-dp/${body.data.documentId}`,
        qs: { status: 'draft' },
      }),
      rq({
        method: 'GET',
        url: `/content-manager/collection-types/api::product-with-dp.product-with-dp/${body.data.documentId}`,
        qs: { status: 'published' },
      }),
    ]);

    expect(draftDocument.body.data).toMatchObject(product);
    expect(publishedDocument.body.data).toMatchObject(product);
    expect(publishedDocument.body.data.publishedAt).toBeISODate();
  });

  // Fix: V5 - Test D&P
  test.skip('Publish article1, expect article1 to be already published', async () => {
    const entry = data.productsWithDP[0];

    const { body } = await rq({
      url: `/content-manager/collection-types/api::product-with-dp.product-with-dp/${entry.documentId}/actions/publish`,
      method: 'POST',
    });

    expect(body).toMatchObject({
      data: null,
      error: {
        status: 400,
        name: 'ApplicationError',
        message: 'already.published',
        details: {},
      },
    });
  });

  describe('Unpublish', () => {
    // FIX: We don't return the draft entry when unpublishing in v5
    test.skip('Unpublish article1, expect article1 to be set to null', async () => {
      const entry = data.productsWithDP[0];

      const { body } = await rq({
        url: `/content-manager/collection-types/api::product-with-dp.product-with-dp/${entry.documentId}/actions/unpublish`,
        method: 'POST',
      });

      data.productsWithDP[0] = body;

      expect(body.publishedAt).toBeNull();
    });

    test.skip('Unpublish article1, expect article1 to already be a draft', async () => {
      const entry = data.productsWithDP[0];

      const { body } = await rq({
        url: `/content-manager/collection-types/api::product-with-dp.product-with-dp/${entry.documentId}/actions/unpublish`,
        method: 'POST',
      });

      expect(body).toMatchObject({
        data: null,
        error: {
          status: 400,
          name: 'ApplicationError',
          message: 'already.draft',
          details: {},
        },
      });
    });

    // Fix: V5 - Test D&P
    test('Unpublish and discard a draft, expect the draft to contain the published data', async () => {
      // Create and publish product
      const product = {
        name: 'Product',
        description: 'Product description',
      };

      const { body } = await rq({
        url: `/content-manager/collection-types/api::product-with-dp.product-with-dp/actions/publish`,
        method: 'POST',
        body: product,
      });

      // Update the product draft
      const updatedProduct = {
        name: 'Product updated',
        description: 'Product description updated',
      };

      // Update the product
      await rq({
        method: 'PUT',
        url: `/content-manager/collection-types/api::product-with-dp.product-with-dp/${body.data.documentId}`,
        body: updatedProduct,
      });

      // Unpublish and discard product draft
      const unpublishRes = await rq({
        method: 'POST',
        url: `/content-manager/collection-types/api::product-with-dp.product-with-dp/${body.data.documentId}/actions/unpublish`,
        body: { discardDraft: true },
      });

      // Get draft
      const draft = await rq({
        method: 'GET',
        url: `/content-manager/collection-types/api::product-with-dp.product-with-dp/${body.data.documentId}`,
        qs: { status: 'draft' },
      });

      expect(unpublishRes.statusCode).toBe(200);
      expect(draft.body.data.publishedAt).toBeNull();
      expect(draft.body.data.name).toBe(product.name);
    });
  });

  // FIX: We don't return the draft entry when deleting in v5
  test.skip('Delete a draft', async () => {
    const res = await rq({
      method: 'DELETE',
      url: `/content-manager/collection-types/api::product-with-dp.product-with-dp/${data.productsWithDP[0].documentId}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject(data.productsWithDP[0]);
    expect(res.body.documentId).toEqual(data.productsWithDP[0].documentId);
    expect(res.body.publishedAt).toBeNull();
    data.productsWithDP.shift();
  });

  describe('Discard', () => {
    test('Discard a draft', async () => {
      // Create and publish a new product
      const product = {
        name: 'Product 4',
        description: 'Product description',
      };

      const { body } = await rq({
        url: `/content-manager/collection-types/api::product-with-dp.product-with-dp/actions/publish`,
        method: 'POST',
        body: product,
      });

      // Update the product
      const updatedProduct = {
        name: 'Product 4 updated',
        description: 'Product description updated',
      };

      await rq({
        method: 'PUT',
        url: `/content-manager/collection-types/api::product-with-dp.product-with-dp/${body.data.documentId}`,
        body: updatedProduct,
      });

      // Discard the draft
      const discardRes = await rq({
        method: 'POST',
        url: `/content-manager/collection-types/api::product-with-dp.product-with-dp/${body.data.documentId}/actions/discard`,
      });

      expect(discardRes.statusCode).toBe(200);
      // The discarded draft should be the same as the published version
      expect(discardRes.body.data.name).toBe(product.name);
      expect(discardRes.body.data.description).toBe(product.description);
    });

    test('Discard a draft that is not published should return 404', async () => {
      // Create a new product
      const product = {
        name: 'Product 5',
        description: 'Product description',
      };

      const { body } = await rq({
        url: `/content-manager/collection-types/api::product-with-dp.product-with-dp`,
        method: 'POST',
        body: product,
      });

      // Discard the draft
      const discardRes = await rq({
        method: 'POST',
        url: `/content-manager/collection-types/api::product-with-dp.product-with-dp/${body.data.documentId}/actions/discard`,
      });

      expect(discardRes.statusCode).toBe(404);
    });
  });

  describe('validators', () => {
    test('Can create a product - minLength', async () => {
      const product = {
        name: 'Product 1',
        description: '',
      };
      const res = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::product-with-dp.product-with-dp',
        body: product,
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.data).toMatchObject(product);
      data.productsWithDP.push(res.body.data);
    });

    test('Can create a product - required', async () => {
      const product = {
        description: 'Product description',
      };
      const res = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::product-with-dp.product-with-dp',
        body: product,
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.data).toMatchObject({
        ...product,
      });
      expect(_.isNil(res.body.data.name)).toBe(true);
      data.productsWithDP.push(res.body.data);
    });

    test('Cannot create a product - maxLength', async () => {
      const product = {
        name: 'Product 1',
        description: "I'm a product description that is very long. At least thirty characters.",
      };
      const res = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::product-with-dp.product-with-dp',
        body: product,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        data: null,
        error: {
          message: 'description must be at most 30 characters',
          name: 'ValidationError',
          details: {
            errors: [
              {
                path: ['description'],
                message: 'description must be at most 30 characters',
                name: 'ValidationError',
              },
            ],
          },
        },
      });
    });
  });
});
