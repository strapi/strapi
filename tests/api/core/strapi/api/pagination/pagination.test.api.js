'use strict';

// Test an API with all the possible filed types and simple filtering (no deep filtering, no relations)
const _ = require('lodash');
const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');
const { createContentAPIRequest, transformToRESTResource } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;
const data = { product: [] };

const getProductAPI = async (pagination) => {
  return rq({
    method: 'GET',
    url: '/products',
    qs: { pagination },
  });
};

const product = {
  attributes: {
    name: {
      type: 'string',
    },
    description: {
      type: 'text',
    },
    price: {
      type: 'float',
    },
  },
  displayName: 'Product',
  singularName: 'product',
  pluralName: 'products',
  description: '',
  collectionName: '',
};

const productFixtures = [
  {
    name: 'Product 1',
    description: 'Product description',
    price: 10.99,
  },
  {
    name: 'Product 2',
    description: 'Product description 2',
    price: 28.31,
  },
  {
    name: 'Product 3',
    description: 'Product description 3',
    price: 12.99,
  },
  {
    name: 'Product 4',
    description: 'Product description 4',
    price: 10.99,
  },
];

describe('Pagination API', () => {
  beforeAll(async () => {
    await builder
      .addContentType(product)
      .addFixtures(product.singularName, productFixtures)
      .build();

    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });

    const sanitizedFixtures = await builder.sanitizedFixtures(strapi);

    Object.assign(data, sanitizedFixtures);
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Paginate entities', () => {
    describe('Use page & pageSize', () => {
      test('First page', async () => {
        const { body } = await getProductAPI({ page: 1, pageSize: 2 });

        expect(body.meta.pagination).toEqual({ page: 1, pageSize: 2, pageCount: 2, total: 4 });
        expect(body.data).toEqual(data.product.slice(0, 2));
      });

      test('Second page', async () => {
        const { body } = await getProductAPI({ page: 2, pageSize: 2 });

        expect(body.meta.pagination).toEqual({ page: 2, pageSize: 2, pageCount: 2, total: 4 });
        expect(body.data).toEqual(data.product.slice(2, 4));
      });

      test('Without count', async () => {
        const { body } = await getProductAPI({ page: 1, pageSize: 2, withCount: false });

        expect(body.meta.pagination).not.toHaveProperty('pageCount');
        expect(body.meta.pagination).not.toHaveProperty('total');
        expect(body.data).toEqual(data.product.slice(0, 2));
      });
    });
    describe('Use start & limit', () => {
      test('First page', async () => {
        const { body } = await getProductAPI({ start: 0, limit: 2 });

        expect(body.meta.pagination).toEqual({ start: 0, limit: 2, total: 4 });
        expect(body.data).toEqual(data.product.slice(0, 2));
      });
      test('Second page', async () => {
        const { body } = await getProductAPI({ start: 2, limit: 2 });

        expect(body.meta.pagination).toEqual({ start: 2, limit: 2, total: 4 });
        expect(body.data).toEqual(data.product.slice(2, 4));
      });
      test('Without count', async () => {
        const { body } = await getProductAPI({ start: 0, limit: 2, withCount: false });

        expect(body.meta.pagination).not.toHaveProperty('pageCount');
        expect(body.meta.pagination).not.toHaveProperty('total');
        expect(body.data).toEqual(data.product.slice(0, 2));
      });
    });
  });
});
