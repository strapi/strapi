'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');
const { createContentAPIRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;
const data = {
  productWithDz: [],
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

const productWithDz = {
  attributes: {
    name: {
      type: 'string',
    },
    description: {
      type: 'text',
    },
    dz: {
      components: ['default.compo'],
      type: 'dynamiczone',
      required: true,
    },
  },
  displayName: 'product-with-dz',
  singularName: 'product-with-dz',
  pluralName: 'product-with-dzs',
  description: '',
  collectionName: '',
};

describe('Core API - Basic + dz', () => {
  beforeAll(async () => {
    await builder.addComponent(compo).addContentType(productWithDz).build();

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
      dz: [
        {
          __component: 'default.compo',
          name: 'compo name',
          description: 'short',
        },
      ],
    };

    const { statusCode, body } = await rq({
      method: 'POST',
      url: '/product-with-dzs',
      body: {
        data: product,
      },
      qs: {
        populate: ['dz'],
      },
    });

    expect(statusCode).toBe(201);

    expect(body.data).toMatchObject({
      documentId: expect.anything(),
      ...product,
    });

    expect(body.data.publishedAt).toBeDefined();

    data.productWithDz.push(body.data);
  });

  test('Read product with compo', async () => {
    const { statusCode, body } = await rq({
      method: 'GET',
      url: '/product-with-dzs',
      qs: {
        populate: ['dz'],
      },
    });

    expect(statusCode).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject(data.productWithDz[0]);
    body.data.forEach((p) => {
      expect(p.publishedAt).toBeDefined();
    });
  });

  test('Update product with compo', async () => {
    const product = {
      name: 'Product 1 updated',
      description: 'Updated Product description',
      dz: [
        {
          __component: 'default.compo',
          name: 'compo name updated',
          description: 'update',
        },
      ],
    };

    const { statusCode, body } = await rq({
      method: 'PUT',
      url: `/product-with-dzs/${data.productWithDz[0].documentId}`,
      body: {
        data: product,
      },
      qs: {
        populate: ['dz'],
      },
    });

    expect(statusCode).toBe(200);
    expect(body.data).toMatchObject({
      documentId: data.productWithDz[0].documentId,
      ...product,
    });

    expect(body.data.publishedAt).toBeDefined();
    data.productWithDz[0] = body.data;
  });

  // TODO V5: Decide response of delete
  test.skip('Delete product with compo', async () => {
    const { statusCode, body } = await rq({
      method: 'DELETE',
      url: `/product-with-dzs/${data.productWithDz[0].documentId}`,
      qs: {
        populate: ['dz'],
      },
    });

    expect(statusCode).toBe(200);

    expect(body.data).toMatchObject(data.productWithDz[0]);
    expect(body.data.publishedAt).toBeDefined();
    data.productWithDz.shift();
  });

  describe('validation', () => {
    test('Cannot create product with compo - compo required', async () => {
      const product = {
        name: 'Product 1',
        description: 'Product description',
      };
      const res = await rq({
        method: 'POST',
        url: '/product-with-dzs',
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
          message: 'dz must be defined.',
          details: {
            errors: [
              {
                path: ['dz'],
                message: 'dz must be defined.',
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
        dz: [
          {
            __component: 'default.compo',
            name: 'compo name',
            description: '',
          },
        ],
      };
      const res = await rq({
        method: 'POST',
        url: '/product-with-dzs',
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
          message: 'dz[0].description must be at least 3 characters',
          details: {
            errors: [
              {
                path: ['dz', '0', 'description'],
                message: 'dz[0].description must be at least 3 characters',
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
        dz: [
          {
            __component: 'default.compo',
            name: 'compo name',
            description: 'A very long description that exceed the min length.',
          },
        ],
      };
      const res = await rq({
        method: 'POST',
        url: '/product-with-dzs',
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
          message: 'dz[0].description must be at most 10 characters',
          details: {
            errors: [
              {
                path: ['dz', '0', 'description'],
                message: 'dz[0].description must be at most 10 characters',
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
        dz: [
          {
            __component: 'default.compo',
            description: 'short',
          },
        ],
      };
      const res = await rq({
        method: 'POST',
        url: '/product-with-dzs',
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
          message: 'dz[0].name must be defined.',
          details: {
            errors: [
              {
                path: ['dz', '0', 'name'],
                message: 'dz[0].name must be defined.',
                name: 'ValidationError',
              },
            ],
          },
        },
      });
    });

    test('Cannot create product with compo - missing __component', async () => {
      const product = {
        name: 'Product 1',
        description: 'Product description',
        dz: [
          {
            name: 'Product 1',
            description: 'short',
          },
        ],
      };
      const res = await rq({
        method: 'POST',
        url: '/product-with-dzs',
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
          message: '2 errors occurred',
          details: {
            errors: [
              {
                path: ['dz', '0', '__component'],
                message: 'dz[0].__component is a required field',
                name: 'ValidationError',
              },
              {
                message:
                  'Cannot build relations store from dynamiczone, component identifier is undefined',
                name: 'ValidationError',
                path: [],
              },
            ],
          },
        },
      });
    });
  });
});
