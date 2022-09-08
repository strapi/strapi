'use strict';

const { omit } = require('lodash/fp');

const { createStrapiInstance } = require('../../../../../../test/helpers/strapi');
const { createTestBuilder } = require('../../../../../../test/helpers/builder');
const { createAuthRequest } = require('../../../../../../test/helpers/request');

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

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject(omit('hiddenAttribute', product));
    expect(res.body).not.toHaveProperty('hiddenAttribute');
    expect(res.body.publishedAt).toBeUndefined();
    data.products.push(res.body);
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
    res.body.results.forEach((p) => expect(p.publishedAt).toBeUndefined());
  });

  test('Update product', async () => {
    const product = {
      name: 'Product 1 updated',
      description: 'Updated Product description',
      hiddenAttribute: 'Secret value',
    };
    const res = await rq({
      method: 'PUT',
      url: `/content-manager/collection-types/api::product.product/${data.products[0].id}`,
      body: product,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject(omit('hiddenAttribute', product));
    expect(res.body.id).toEqual(data.products[0].id);
    expect(res.body.publishedAt).toBeUndefined();
    data.products[0] = res.body;
  });

  test('Delete product', async () => {
    const res = await rq({
      method: 'DELETE',
      url: `/content-manager/collection-types/api::product.product/${data.products[0].id}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject(data.products[0]);
    expect(res.body.id).toEqual(data.products[0].id);
    expect(res.body.publishedAt).toBeUndefined();
    data.products.shift();
  });

  describe('validators', () => {
    test('Cannot create a product - minLength', async () => {
      const product = {
        name: 'Product 1',
        description: '',
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

    test('Cannot create a product - required', async () => {
      const product = {
        description: 'Product description',
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
          message: 'name must be defined.',
          name: 'ValidationError',
          details: {
            errors: [
              {
                path: ['name'],
                message: 'name must be defined.',
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
