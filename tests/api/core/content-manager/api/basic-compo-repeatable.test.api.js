'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;
const data = {
  productsWithCompo: [],
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

const productWithCompo = {
  attributes: {
    name: {
      type: 'string',
    },
    description: {
      type: 'text',
    },
    compo: {
      component: 'default.compo',
      type: 'component',
      required: true,
      repeatable: true,
    },
  },
  displayName: 'product with compo',
  singularName: 'product-with-compo',
  pluralName: 'product-with-compos',
  description: '',
  collectionName: '',
};

describe('CM API - Basic + compo', () => {
  beforeAll(async () => {
    await builder.addComponent(compo).addContentType(productWithCompo).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Create product with compo', async () => {
    const product = {
      name: 'Product 1',
      description: 'Product description',
      compo: [
        {
          name: 'compo name',
          description: 'short',
        },
      ],
    };
    const res = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::product-with-compo.product-with-compo',
      body: product,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toMatchObject(product);
    expect(res.body.data.publishedAt).toBeDefined();
    data.productsWithCompo.push(res.body.data);
  });

  test('Read product with compo', async () => {
    const res = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/api::product-with-compo.product-with-compo/${data.productsWithCompo[0].documentId}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject(data.productsWithCompo[0]);
    expect(res.body.data.publishedAt).toBeDefined();
  });

  test('Update product with compo', async () => {
    const product = {
      name: 'Product 1 updated',
      description: 'Updated Product description',
      compo: [
        {
          name: 'compo name updated',
          description: 'update',
        },
      ],
    };
    const res = await rq({
      method: 'PUT',
      url: `/content-manager/collection-types/api::product-with-compo.product-with-compo/${data.productsWithCompo[0].documentId}`,
      body: product,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject(product);
    expect(res.body.data.documentId).toEqual(data.productsWithCompo[0].documentId);
    expect(res.body.data.publishedAt).toBeDefined();
    data.productsWithCompo[0] = res.body.data;
  });

  test('Delete product with compo', async () => {
    const res = await rq({
      method: 'DELETE',
      url: `/content-manager/collection-types/api::product-with-compo.product-with-compo/${data.productsWithCompo[0].documentId}`,
    });

    expect(res.statusCode).toBe(200);
    data.productsWithCompo.shift();
  });

  describe.skip('validation', () => {
    test('Cannot create product with compo - compo required', async () => {
      const product = {
        name: 'Product 1',
        description: 'Product description',
      };
      const res = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::product-with-compo.product-with-compo',
        body: product,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        data: null,
        error: {
          status: 400,
          name: 'ValidationError',
          message: 'compo must be defined.',
          details: {
            errors: [
              {
                path: ['compo'],
                message: 'compo must be defined.',
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
        compo: [
          {
            name: 'compo name',
            description: '',
          },
        ],
      };

      const creationRes = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::product-with-compo.product-with-compo',
        body: product,
      });

      const res = await rq({
        method: 'POST',
        url: `/content-manager/collection-types/api::product-with-compo.product-with-compo/${creationRes.body.documentId}/actions/publish`,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        data: null,
        error: {
          status: 400,
          name: 'ValidationError',
          message: 'compo[0].description must be at least 4 characters',
          details: {
            errors: [
              {
                path: ['compo', '0', 'description'],
                message: 'compo[0].description must be at least 4 characters',
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
        compo: [
          {
            name: 'compo name',
            description: 'A very long description that exceed the min length.',
          },
        ],
      };
      const res = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::product-with-compo.product-with-compo',
        body: product,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        data: null,
        error: {
          status: 400,
          name: 'ValidationError',
          message: 'compo[0].description must be at most 30 characters',
          details: {
            errors: [
              {
                path: ['compo', '0', 'description'],
                message: 'compo[0].description must be at most 30 characters',
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
        compo: [
          {
            description: 'short',
          },
        ],
      };

      const creationRes = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::product-with-compo.product-with-compo',
        body: product,
      });

      const res = await rq({
        method: 'POST',
        url: `/content-manager/collection-types/api::product-with-compo.product-with-compo/${creationRes.body.documentId}/actions/publish`,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        data: null,
        error: {
          status: 400,
          name: 'ValidationError',
          message: 'compo[0].name must be a `string` type, but the final value was: `null`.',
          details: {
            errors: [
              {
                path: ['compo', '0', 'name'],
                message: 'compo[0].name must be a `string` type, but the final value was: `null`.',
                name: 'ValidationError',
              },
            ],
          },
        },
      });
    });
  });
});
