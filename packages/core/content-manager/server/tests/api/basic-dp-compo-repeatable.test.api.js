'use strict';

// Test a simple default API with no relations

const { createTestBuilder } = require('../../../../../../test/helpers/builder');
const { createStrapiInstance } = require('../../../../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../../../../test/helpers/request');

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
      repeatable: true,
    },
  },
  draftAndPublish: true,
  displayName: 'product with compo and DP',
  singularName: 'product-with-compo-and-dp',
  pluralName: 'product-with-compo-and-dps',
  description: '',
  collectionName: '',
};

describe('CM API - Basic + compo + draftAndPublish', () => {
  beforeAll(async () => {
    await builder.addComponent(compo).addContentType(productWithCompoAndDP).build();

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
      url: '/content-manager/collection-types/api::product-with-compo-and-dp.product-with-compo-and-dp',
      body: product,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject(product);
    expect(res.body.publishedAt).toBeNull();
    data.productsWithCompoAndDP.push(res.body);
  });

  test('Read product with compo', async () => {
    const res = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/api::product-with-compo-and-dp.product-with-compo-and-dp/${data.productsWithCompoAndDP[0].id}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject(data.productsWithCompoAndDP[0]);
    expect(res.body.publishedAt).toBeNull();
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
      url: `/content-manager/collection-types/api::product-with-compo-and-dp.product-with-compo-and-dp/${data.productsWithCompoAndDP[0].id}`,
      body: product,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject(product);
    expect(res.body.id).toEqual(data.productsWithCompoAndDP[0].id);
    expect(res.body.publishedAt).toBeNull();
    data.productsWithCompoAndDP[0] = res.body;
  });

  test('Delete product with compo', async () => {
    const res = await rq({
      method: 'DELETE',
      url: `/content-manager/collection-types/api::product-with-compo-and-dp.product-with-compo-and-dp/${data.productsWithCompoAndDP[0].id}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject(data.productsWithCompoAndDP[0]);
    expect(res.body.id).toEqual(data.productsWithCompoAndDP[0].id);
    expect(res.body.publishedAt).toBeNull();
    data.productsWithCompoAndDP.shift();
  });

  describe('validation', () => {
    test('Can create product with compo - compo required - []', async () => {
      const product = {
        name: 'Product 1',
        description: 'Product description',
        compo: [],
      };
      const res = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::product-with-compo-and-dp.product-with-compo-and-dp',
        body: product,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(product);
      data.productsWithCompoAndDP.push(res.body);
    });

    test('Can create product with compo - minLength', async () => {
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
      const res = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::product-with-compo-and-dp.product-with-compo-and-dp',
        body: product,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(product);
      data.productsWithCompoAndDP.push(res.body);
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
        url: '/content-manager/collection-types/api::product-with-compo-and-dp.product-with-compo-and-dp',
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

    test('Can create product with compo - required', async () => {
      const product = {
        name: 'Product 1',
        description: 'Product description',
        compo: [
          {
            description: 'short',
          },
        ],
      };
      const res = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::product-with-compo-and-dp.product-with-compo-and-dp',
        body: product,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(product);
      data.productsWithCompoAndDP.push(res.body);
    });
  });
});
