'use strict';

const { omit } = require('lodash/fp');

const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;

const product = {
  attributes: {
    name: {
      type: 'string',
      required: true,
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

const createProduct = async (product) => {
  const res = await rq({
    method: 'POST',
    url: '/content-manager/collection-types/api::product.product',
    body: product,
  });

  return { data: res.body.data, status: res.statusCode };
};

const getProducts = async ({ page, pageSize }) => {
  const res = await rq({
    method: 'GET',
    url: `/content-manager/collection-types/api::product.product`,
    qs: {
      page,
      pageSize,
    },
  });

  return { products: res.body.results, pagination: res.body.pagination, status: res.statusCode };
};

describe('CM API - Pagination', () => {
  beforeAll(async () => {
    await builder.addContentType(product).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    await Promise.all([
      createProduct({ name: 'Product 1' }),
      createProduct({ name: 'Product 2' }),
      createProduct({ name: 'Product 3' }),
      createProduct({ name: 'Product 4' }),
      createProduct({ name: 'Product 5' }),
    ]);
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Default pagination', async () => {
    const { products, pagination, status } = await getProducts({});

    expect(status).toBe(200);
    expect(pagination.page).toBe(1);
    expect(pagination.pageSize).toBe(10);
    expect(pagination.total).toBe(5);
    expect(products).toHaveLength(5);
  });

  test('Custom pagination', async () => {
    // Get first page
    const { products, pagination, status } = await getProducts({ page: 1, pageSize: 3 });

    expect(status).toBe(200);
    expect(pagination.page).toBe(1);
    expect(pagination.pageSize).toBe(3);
    expect(pagination.total).toBe(5);
    expect(products).toHaveLength(3);
    // Products should be Product 1, Product 2, Product 3
    expect(products).toMatchObject([
      { name: 'Product 1' },
      { name: 'Product 2' },
      { name: 'Product 3' },
    ]);
  });

  test('Custom pagination - second page', async () => {
    // Get second page
    const { products, pagination, status } = await getProducts({ page: 2, pageSize: 3 });

    expect(status).toBe(200);
    expect(pagination.page).toBe(2);
    expect(pagination.pageSize).toBe(3);
    expect(pagination.total).toBe(5);
    expect(products).toHaveLength(2);
    // Products should be Product 4, Product 5
    expect(products).toMatchObject([{ name: 'Product 4' }, { name: 'Product 5' }]);
  });
});
