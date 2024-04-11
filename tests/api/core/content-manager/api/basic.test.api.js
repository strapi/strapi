'use strict';

const { omit } = require('lodash/fp');

const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;
const data = {
  products: [],
};

const product = {
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
    hiddenAttribute: {
      type: 'string',
    },
  },
  config: {
    attributes: {
      hiddenAttribute: {
        hidden: true,
      },
    },
  },
  draftAndPublish: true,
  displayName: 'Product',
  singularName: 'product',
  pluralName: 'products',
  description: '',
  collectionName: '',
};

describe('CM API - Basic', () => {
  beforeAll(async () => {
    await builder.addContentType(product).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Create product', async () => {
    const product = {
      name: 'Product 1',
      description: 'Product description',
      hiddenAttribute: 'Secret value',
    };
    const res = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::product.product',
      body: product,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toMatchObject(omit('hiddenAttribute', product));
    expect(res.body.data).not.toHaveProperty('hiddenAttribute');
    expect(res.body.data.publishedAt).toBeDefined();
    data.products.push(res.body.data);
  });

  test('Read product', async () => {
    const res = await rq({
      method: 'GET',
      url: '/content-manager/collection-types/api::product.product',
    });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Product 1',
          description: 'Product description',
        }),
      ])
    );
    res.body.results.forEach((p) => expect(p.publishedAt).toBeDefined());
  });

  test('Update product', async () => {
    const product = {
      name: 'Product 1 updated',
      description: 'Updated Product description',
      hiddenAttribute: 'Secret value',
    };
    const res = await rq({
      method: 'PUT',
      url: `/content-manager/collection-types/api::product.product/${data.products[0].documentId}`,
      body: product,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject(omit('hiddenAttribute', product));
    expect(res.body.data.documentId).toEqual(data.products[0].documentId);
    expect(res.body.data.publishedAt).toBeDefined();
    data.products[0] = res.body.data;
  });

  test('Delete product', async () => {
    const res = await rq({
      method: 'DELETE',
      url: `/content-manager/collection-types/api::product.product/${data.products[0].documentId}`,
    });

    expect(res.statusCode).toBe(200);
    data.products.shift();
  });

  test('Clone product', async () => {
    const product = {
      name: 'Product 1',
      description: 'Product description',
      hiddenAttribute: 'Secret value',
    };
    const { body: createdProduct } = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::product.product',
      body: product,
    });

    const res = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/api::product.product/clone/${createdProduct.data.documentId}`,
      body: {},
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject(omit('hiddenAttribute', product));
  });

  test('Clone and update product', async () => {
    const product = {
      name: 'Product 1',
      description: 'Product description',
      hiddenAttribute: 'Secret value',
    };
    const { body: createdProduct } = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::product.product',
      body: product,
    });

    const res = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/api::product.product/clone/${createdProduct.data.documentId}`,
      body: {
        name: 'Product 1 updated',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      name: 'Product 1 updated',
      description: 'Product description',
    });
  });

  // TODO: Fix document service validations
  describe('validators', () => {
    test('Cannot publish a product - minLength', async () => {
      const product = {
        name: 'Product 1',
        description: '',
      };

      const creationRes = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::product.product',
        body: product,
      });

      const res = await rq({
        method: 'POST',
        url: `/content-manager/collection-types/api::product.product/${creationRes.body.data.documentId}/actions/publish`,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        data: null,
        error: {
          message: 'description must be at least 4 characters',
          name: 'ValidationError',
          details: {
            errors: [
              {
                path: ['description'],
                message: 'description must be at least 4 characters',
                name: 'ValidationError',
              },
            ],
          },
        },
      });
    });

    test('Cannot publish a product - required', async () => {
      const product = {
        description: 'Product description',
      };

      const creationRes = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::product.product',
        body: product,
      });

      const res = await rq({
        method: 'POST',
        url: `/content-manager/collection-types/api::product.product/${creationRes.body.data.documentId}/actions/publish`,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        data: null,
        error: {
          message: 'name must be a `string` type, but the final value was: `null`.',
          name: 'ValidationError',
          details: {
            errors: [
              {
                path: ['name'],
                message: 'name must be a `string` type, but the final value was: `null`.',
                name: 'ValidationError',
              },
            ],
          },
        },
      });
    });

    test('Cannot create a product - maxLength', async () => {
      const product = {
        name: 'Product 1',
        description: "I'm a product description that is very long. At least thirty characters.",
      };

      const res = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::product.product',
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
