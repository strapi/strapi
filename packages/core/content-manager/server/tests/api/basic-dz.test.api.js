'use strict';

const { createTestBuilder } = require('../../../../../../test/helpers/builder');
const { createStrapiInstance } = require('../../../../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../../../../test/helpers/request');

const builder = createTestBuilder();
let strapi;
let rq;
const data = {
  productsWithDz: [],
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
  displayName: 'Product with dz',
  singularName: 'product-with-dz',
  pluralName: 'product-with-dzs',
  description: '',
  collectionName: '',
};

describe('CM API - Basic + dz', () => {
  beforeAll(async () => {
    await builder.addComponent(compo).addContentType(productWithDz).build();

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
      dz: [
        {
          __component: 'default.compo',
          name: 'compo name',
          description: 'short',
        },
      ],
    };
    const res = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::product-with-dz.product-with-dz',
      body: product,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject(product);
    expect(res.body.publishedAt).toBeUndefined();
    data.productsWithDz.push(res.body);
  });

  test('Read product with compo', async () => {
    const res = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/api::product-with-dz.product-with-dz/${data.productsWithDz[0].id}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject(data.productsWithDz[0]);
    expect(res.body.publishedAt).toBeUndefined();
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
    const res = await rq({
      method: 'PUT',
      url: `/content-manager/collection-types/api::product-with-dz.product-with-dz/${data.productsWithDz[0].id}`,
      body: product,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject(product);
    expect(res.body.id).toEqual(data.productsWithDz[0].id);
    expect(res.body.publishedAt).toBeUndefined();
    data.productsWithDz[0] = res.body;
  });

  test('Delete product with compo', async () => {
    const res = await rq({
      method: 'DELETE',
      url: `/content-manager/collection-types/api::product-with-dz.product-with-dz/${data.productsWithDz[0].id}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject(data.productsWithDz[0]);
    expect(res.body.id).toEqual(data.productsWithDz[0].id);
    expect(res.body.publishedAt).toBeUndefined();
    data.productsWithDz.shift();
  });

  describe('validation', () => {
    test('Cannot create product with compo - compo required', async () => {
      const product = {
        name: 'Product 1',
        description: 'Product description',
      };
      const res = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::product-with-dz.product-with-dz',
        body: product,
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
        url: '/content-manager/collection-types/api::product-with-dz.product-with-dz',
        body: product,
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
        url: '/content-manager/collection-types/api::product-with-dz.product-with-dz',
        body: product,
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
        url: '/content-manager/collection-types/api::product-with-dz.product-with-dz',
        body: product,
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
        url: '/content-manager/collection-types/api::product-with-dz.product-with-dz',
        body: product,
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
                message: "Cannot read properties of undefined (reading 'attributes')",
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
