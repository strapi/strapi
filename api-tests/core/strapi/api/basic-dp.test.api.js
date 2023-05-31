'use strict';

const _ = require('lodash');

const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');
const { createContentAPIRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;
const data = {
  products: [],
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
      minLength: 3,
      maxLength: 10,
    },
  },
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
  displayName: 'product-with-dp',
  singularName: 'product-with-dp',
  pluralName: 'product-with-dps',
  description: '',
  collectionName: '',
};

describe('Core API - Basic + draftAndPublish', () => {
  beforeAll(async () => {
    await builder.addComponent(compo).addContentType(productWithDP).build();

    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });
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

    const { statusCode, body } = await rq({
      method: 'POST',
      url: '/product-with-dps',
      body: {
        data: product,
      },
    });

    expect(statusCode).toBe(200);
    expect(body.data).toMatchObject({
      id: expect.anything(),
      attributes: product,
    });

    expect(body.data.attributes.publishedAt).toBeISODate();

    data.products.push(body.data);
  });

  test('Create a product + can overwrite publishedAt', async () => {
    const product = {
      name: 'Product 2',
      description: 'Product description',
      publishedAt: '2020-08-20T10:27:55.000Z',
    };

    const { statusCode, body } = await rq({
      method: 'POST',
      url: '/product-with-dps',
      body: {
        data: product,
      },
    });

    expect(statusCode).toBe(200);
    expect(body.data).toMatchObject({
      id: expect.anything(),
      attributes: product,
    });

    expect(body.data.attributes.publishedAt).toBeISODate();

    data.products.push(body.data);
  });

  test('Read products', async () => {
    const { statusCode, body } = await rq({
      method: 'GET',
      url: '/product-with-dps',
    });

    expect(statusCode).toBe(200);

    expect(body.data).toHaveLength(2);
    expect(body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.anything(),
          attributes: expect.objectContaining({
            name: 'Product 1',
            description: 'Product description',
          }),
        }),
      ])
    );

    body.data.forEach((p) => {
      expect(p.attributes.publishedAt).toBeISODate();
    });
  });

  test('Update product', async () => {
    const product = {
      name: 'Product 1 updated',
      description: 'Updated Product description',
    };

    const { statusCode, body } = await rq({
      method: 'PUT',
      url: `/product-with-dps/${data.products[0].id}`,
      body: {
        data: product,
      },
    });

    expect(statusCode).toBe(200);
    expect(body.data).toMatchObject({
      id: data.products[0].id,
      attributes: product,
    });

    expect(body.data.attributes.publishedAt).toBeISODate();

    data.products[0] = body.data;
  });

  test('Update product + can overwrite publishedAt', async () => {
    const product = {
      name: 'Product 1 updated',
      description: 'Updated Product description',
      publishedAt: '2020-08-27T09:50:50.000Z',
    };

    const { statusCode, body } = await rq({
      method: 'PUT',
      url: `/product-with-dps/${data.products[0].id}`,
      body: {
        data: product,
      },
    });

    expect(statusCode).toBe(200);

    expect(body.data).toMatchObject({
      id: data.products[0].id,
      attributes: _.pick(data.products[0], ['name', 'description']),
    });

    expect(body.data.attributes.publishedAt).toBeISODate();
    expect(body.data.attributes.publishedAt).toBe(product.publishedAt);
    data.products[0] = body.data;
  });

  test('Delete product', async () => {
    const { statusCode, body } = await rq({
      method: 'DELETE',
      url: `/product-with-dps/${data.products[0].id}`,
    });

    expect(statusCode).toBe(200);
    expect(body.data).toMatchObject(data.products[0]);
    expect(body.data.id).toEqual(data.products[0].id);
    expect(body.data.attributes.publishedAt).toBeISODate();
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
        url: '/product-with-dps',
        body: {
          data: product,
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        data: null,
        error: {
          message: 'description must be at least 3 characters',
          name: 'ValidationError',
          details: {
            errors: [
              {
                path: ['description'],
                message: 'description must be at least 3 characters',
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
        url: '/product-with-dps',
        body: {
          data: product,
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        data: null,
        error: {
          status: 400,
          name: 'ValidationError',
          message: 'name must be defined.',
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
        url: '/product-with-dps',
        body: {
          data: product,
        },
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
