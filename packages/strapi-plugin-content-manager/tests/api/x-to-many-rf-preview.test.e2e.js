'use strict';

const { prop, difference, map, uniq } = require('lodash/fp');
const { createAuthRequest } = require('../../../../test/helpers/request');
const { createStrapiInstance } = require('../../../../test/helpers/strapi');
const { createTestBuilder } = require('../../../../test/helpers/builder');

const toIds = arr => uniq(map(prop('id'))(arr));

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
      nature: 'oneToMany',
      private: false,
      target: 'application::category.category',
      targetAttribute: 'product',
    },
    shops: {
      nature: 'manyWay',
      target: 'application::shop.shop',
    },
  },
  name: 'product',
};

const categoryModel = {
  attributes: {
    name: {
      type: 'string',
      unique: true,
    },
  },
  name: 'category',
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
  name: 'shop',
};

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
      categories: category.slice(0, 5).map(prop('id')),
      shops: shop.slice(0, 12).map(prop('id')),
    },
  ],
};

const getUID = modelName => `application::${modelName}.${modelName}`;
const getCMPrefixUrl = modelName => `/content-manager/collection-types/${getUID(modelName)}`;

describe('x-to-many RF Preview', () => {
  const cmProductUrl = getCMPrefixUrl(productModel.name);

  beforeAll(async () => {
    await builder
      .addContentTypes([shopModel, categoryModel, productModel])
      .addFixtures(shopModel.name, fixtures.shop)
      .addFixtures(categoryModel.name, fixtures.category)
      .addFixtures(productModel.name, fixtures.product)
      .build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    Object.assign(data, builder.sanitizedFixtures(strapi));
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Entity Misc', () => {
    test.each(['foobar', 'name'])(`Throws if the targeted field is invalid (%s)`, async field => {
      const product = data.product[0];
      const { body, statusCode } = await rq.get(`${cmProductUrl}/${product.id}/${field}`);

      expect(statusCode).toBe(400);
      expect(body.error).toBe('Bad Request');
      expect(body.message).toBe('Invalid target field');
    });

    test('Throws if the entity does not exist', async () => {
      const { body, statusCode } = await rq.get(`${cmProductUrl}/${data.shop[11].id}/categories`);

      expect(statusCode).toBe(404);
      expect(body.error).toBe('Not Found');
    });
  });

  describe('Relation Nature', () => {
    test(`Throws if the relation's nature is not a x-to-many`, async () => {
      const url = getCMPrefixUrl(categoryModel.name);
      const id = data.category[0].id;

      const { body, statusCode } = await rq.get(`${url}/${id}/product`);

      expect(statusCode).toBe(400);
      expect(body.error).toBe('Bad Request');
      expect(body.message).toBe('Invalid target field');
    });
  });

  describe('Default Behavior', () => {
    test.each(['shops', 'categories'])('Should return a preview for the %s field', async field => {
      const product = data.product[0];

      const { body, statusCode } = await rq.get(`${cmProductUrl}/${product.id}/${field}`);

      const expected = product[field].slice(0, 10);

      expect(statusCode).toBe(200);
      expect(body.results).toHaveLength(expected.length);
      expect(difference(toIds(body.results), toIds(product[field]))).toHaveLength(0);
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
      expect(results).toHaveLength(
        Math.min(pageSize, product.shops.length - pageSize * (page - 1))
      );
    });
  });
});
