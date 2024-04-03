'use strict';

const { prop, difference, map, uniq } = require('lodash/fp');
const { createAuthRequest } = require('api-tests/request');
const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');

const toIds = (arr) => uniq(map(prop('id'))(arr));

let strapi;
let rq;
const builder = createTestBuilder();

const data = {
  product: [],
  category: [],
  shop: [],
};

const productModel = {
  attributes: {
    name: {
      type: 'string',
      unique: true,
    },
    categories: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'api::category.category',
      targetAttribute: 'product',
    },
    shops: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'api::shop.shop',
    },
  },
  displayName: 'Product',
  singularName: 'product',
  pluralName: 'products',
};

const categoryModel = {
  attributes: {
    name: {
      type: 'string',
      unique: true,
    },
  },
  displayName: 'Category',
  singularName: 'category',
  pluralName: 'categories',
};

const shopModel = {
  attributes: {
    name: {
      type: 'string',
      unique: true,
    },
    metadata: {
      type: 'string',
    },
  },
  displayName: 'Shop',
  singularName: 'shop',
  pluralName: 'shops',
};

const PRODUCT_SHOP_COUNT = 12;
const PRODUCT_CATEGORY_COUNT = 5;
const fixtures = {
  shop: [
    { name: 'SH.A', metadata: 'foobar' },
    { name: 'SH.B', metadata: 'foobar' },
    { name: 'SH.C', metadata: 'foobar' },
    { name: 'SH.D', metadata: 'foobar' },
    { name: 'SH.E', metadata: 'foobar' },
    { name: 'SH.F', metadata: 'foobar' },
    { name: 'SH.G', metadata: 'foobar' },
    { name: 'SH.H', metadata: 'foobar' },
    { name: 'SH.I', metadata: 'foobar' },
    { name: 'SH.J', metadata: 'foobar' },
    { name: 'SH.K', metadata: 'foobar' },
    { name: 'SH.L', metadata: 'foobar' },
  ],
  category: [
    { name: 'CT.A' },
    { name: 'CT.B' },
    { name: 'CT.C' },
    { name: 'CT.D' },
    { name: 'CT.E' },
    { name: 'CT.F' },
    { name: 'CT.G' },
    { name: 'CT.H' },
    { name: 'CT.I' },
    { name: 'CT.J' },
    { name: 'CT.K' },
    { name: 'CT.L' },
  ],
  product: ({ shop, category }) => [
    {
      name: 'PD.A',
      categories: category.slice(0, PRODUCT_CATEGORY_COUNT).map(prop('id')),
      shops: shop.slice(0, PRODUCT_SHOP_COUNT).map(prop('id')),
    },
  ],
};

const getUID = (modelName) => `api::${modelName}.${modelName}`;
const getCMPrefixUrl = (modelName) => `/content-manager/relations/${getUID(modelName)}`;

// TODO: Fix relations
describe.skip('x-to-many RF Preview', () => {
  const cmProductUrl = getCMPrefixUrl(productModel.singularName);

  beforeAll(async () => {
    await builder
      .addContentTypes([shopModel, categoryModel, productModel])
      .addFixtures(shopModel.singularName, fixtures.shop)
      .addFixtures(categoryModel.singularName, fixtures.category)
      .addFixtures(productModel.singularName, fixtures.product)
      .build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    Object.assign(data, await builder.sanitizedFixtures(strapi));
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Entity Misc', () => {
    test.each(['foobar', 'name'])(`Throws if the targeted field is invalid (%s)`, async (field) => {
      const product = data.product[0];
      const { body, statusCode } = await rq.get(`${cmProductUrl}/${product.id}/${field}`);

      expect(statusCode).toBe(400);
      expect(body).toMatchObject({
        data: null,
        error: {
          status: 400,
          name: 'BadRequestError',
          message: "This relational field doesn't exist",
          details: {},
        },
      });
    });

    test('Throws if the entity does not exist', async () => {
      const { body, statusCode } = await rq.get(`${cmProductUrl}/${data.shop[11].id}/categories`);

      expect(statusCode).toBe(404);
      expect(body).toMatchObject({
        data: null,
        error: {
          status: 404,
          name: 'NotFoundError',
          message: 'Not Found',
          details: {},
        },
      });
    });
  });

  describe('Default Behavior', () => {
    test('Should return a preview for the shops field', async () => {
      const product = data.product[0];

      const { body, statusCode } = await rq.get(`${cmProductUrl}/${product.id}/shops`);
      expect(statusCode).toBe(200);
      expect(body.results).toHaveLength(10);
      expect(body.pagination).toMatchObject({ page: 1, pageSize: 10, pageCount: 2, total: 12 });
      expect(difference(toIds(body.results), toIds(data.shop))).toHaveLength(0);
    });

    test('Should return a preview for the categories field', async () => {
      const product = data.product[0];

      const { body, statusCode } = await rq.get(`${cmProductUrl}/${product.id}/categories`);

      expect(statusCode).toBe(200);
      expect(body.results).toHaveLength(5);
      expect(body.pagination).toMatchObject({ page: 1, pageSize: 10, pageCount: 1, total: 5 });
      expect(difference(toIds(body.results), toIds(data.category))).toHaveLength(0);
    });
  });

  describe('Pagination', () => {
    test.each([
      [1, 10],
      [2, 10],
      [5, 1],
      [4, 2],
      [1, 100],
    ])('Custom pagination (%s, %s)', async (page, pageSize) => {
      const product = data.product[0];

      const { body, statusCode } = await rq.get(
        `${cmProductUrl}/${product.id}/shops?page=${page}&pageSize=${pageSize}`
      );

      expect(statusCode).toBe(200);

      const { pagination, results } = body;

      expect(pagination.page).toBe(page);
      expect(pagination.pageSize).toBe(pageSize);
      expect(results).toHaveLength(Math.min(pageSize, PRODUCT_SHOP_COUNT - pageSize * (page - 1)));
    });
  });
});
