'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');
const { createContentAPIRequest } = require('api-tests/request');

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
      minLength: 3,
      maxLength: 10,
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
  displayName: 'product-with-compo-and-dp',
  singularName: 'product-with-compo-and-dp',
  pluralName: 'product-with-compo-and-dps',
  description: '',
  collectionName: '',
};

describe('Core API - Basic + compo', () => {
  beforeAll(async () => {
    await builder.addComponent(compo).addContentType(productWithCompoAndDP).build();

    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });
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

    const { statusCode, body } = await rq({
      method: 'POST',
      url: '/product-with-compo-and-dps',
      body: {
        data: product,
      },
      qs: {
        populate: ['compo'],
      },
    });

    expect(statusCode).toBe(201);

    expect(body.data).toMatchObject({
      documentId: expect.anything(),
      ...product,
    });

    expect(body.data.publishedAt).toBeISODate();
    data.productsWithCompoAndDP.push(body.data);
  });

  test('Read product with compo', async () => {
    const { statusCode, body } = await rq({
      method: 'GET',
      url: '/product-with-compo-and-dps',
      qs: {
        populate: ['compo'],
      },
    });

    expect(statusCode).toBe(200);

    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject(data.productsWithCompoAndDP[0]);
    body.data.forEach((p) => {
      expect(p.publishedAt).toBeISODate();
    });
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
    const { statusCode, body } = await rq({
      method: 'PUT',
      url: `/product-with-compo-and-dps/${data.productsWithCompoAndDP[0].documentId}`,
      body: {
        data: product,
      },
      qs: {
        populate: ['compo'],
      },
    });

    expect(statusCode).toBe(200);
    expect(body.data).toMatchObject({
      documentId: data.productsWithCompoAndDP[0].documentId,
      ...product,
    });

    expect(body.data.publishedAt).toBeISODate();

    data.productsWithCompoAndDP[0] = body.data;
  });

  // TODO V5: Decide response of delete
  test.skip('Delete product with compo', async () => {
    const { statusCode, body } = await rq({
      method: 'DELETE',
      url: `/product-with-compo-and-dps/${data.productsWithCompoAndDP[0].documentId}`,
      qs: {
        populate: ['compo'],
      },
    });

    expect(statusCode).toBe(200);

    expect(body.data).toMatchObject(data.productsWithCompoAndDP[0]);
    expect(body.data.publishedAt).toBeISODate();
    data.productsWithCompoAndDP.shift();
  });

  // TODO V5: Decide response of delete
  describe.skip('database state', () => {
    test('components have been removed from the database', async () => {
      const dbComponents = await strapi.db
        .query('default.compo')
        .findMany({ name: 'compo name updated' });
      expect(dbComponents).toHaveLength(0);
    });
  });

  describe('validation', () => {
    test('Cannot create product with compo - compo required', async () => {
      const product = {
        name: 'Product 1',
        description: 'Product description',
      };
      const res = await rq({
        method: 'POST',
        url: '/product-with-compo-and-dps',
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
          message: 'compo must be a `object` type, but the final value was: `null`.',
          details: {
            errors: [
              {
                path: ['compo'],
                message: 'compo must be a `object` type, but the final value was: `null`.',
                name: 'ValidationError',
              },
            ],
          },
        },
      });
    });

    test('Cannot create product with compo - minLength', async () => {
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
        url: '/product-with-compo-and-dps',
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
          message: 'compo.description must be at least 3 characters',
          details: {
            errors: [
              {
                path: ['compo', 'description'],
                message: 'compo.description must be at least 3 characters',
                name: 'ValidationError',
              },
            ],
          },
        },
      });
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
        url: '/product-with-compo-and-dps',
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
          message: 'compo.description must be at most 10 characters',
          details: {
            errors: [
              {
                path: ['compo', 'description'],
                message: 'compo.description must be at most 10 characters',
                name: 'ValidationError',
              },
            ],
          },
        },
      });
    });

    test('Cannot create product with compo - required', async () => {
      const product = {
        name: 'Product 1',
        description: 'Product description',
        compo: {
          description: 'short',
        },
      };
      const res = await rq({
        method: 'POST',
        url: '/product-with-compo-and-dps',
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
          message: 'compo.name must be a `string` type, but the final value was: `null`.',
          details: {
            errors: [
              {
                path: ['compo', 'name'],
                message: 'compo.name must be a `string` type, but the final value was: `null`.',
                name: 'ValidationError',
              },
            ],
          },
        },
      });
    });
  });
});
