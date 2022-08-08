'use strict';

// Test a simple default API with no relations

const { omit, pick } = require('lodash/fp');

const { createTestBuilder } = require('../../../../../test/helpers/builder');
const { createStrapiInstance } = require('../../../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../../../test/helpers/request');

let strapi;
let rq;
const data = {
  products: [],
  shops: [],
};

const productModel = {
  attributes: {
    name: {
      type: 'string',
    },
  },
  displayName: 'Product',
  singularName: 'product',
  pluralName: 'products',
  description: '',
  collectionName: '',
};

const productWithDPModel = {
  attributes: {
    name: {
      type: 'string',
    },
  },
  displayName: 'Product',
  singularName: 'product',
  pluralName: 'products',
  draftAndPublish: true,
  description: '',
  collectionName: '',
};

const shopModel = {
  attributes: {
    name: {
      type: 'string',
    },
    products: {
      type: 'relation',
      relation: 'manyToMany',
      target: 'api::product.product',
      targetAttribute: 'shops',
    },
  },
  displayName: 'Shop',
  singularName: 'shop',
  pluralName: 'shops',
};

const shops = [
  {
    name: 'market',
  },
];

const products = ({ withPublished = false }) => ({ shop }) => {
  const shops = [shop[0].id];

  const entries = [
    {
      name: 'tomato',
      shops,
      publishedAt: new Date(),
    },
    {
      name: 'apple',
      shops,
      publishedAt: null,
    },
  ];

  if (withPublished) {
    return entries;
  }

  return entries.map(omit('publishedAt'));
};

describe('Relation-list route', () => {
  describe('without draftAndPublish', () => {
    const builder = createTestBuilder();

    beforeAll(async () => {
      await builder
        .addContentTypes([productModel, shopModel])
        .addFixtures(shopModel.singularName, shops)
        .addFixtures(productModel.singularName, products({ withPublished: false }))
        .build();

      strapi = await createStrapiInstance();
      rq = await createAuthRequest({ strapi });

      data.shops = await builder.sanitizedFixturesFor(shopModel.singularName, strapi);
      data.products = await builder.sanitizedFixturesFor(productModel.singularName, strapi);
    });

    afterAll(async () => {
      await strapi.destroy();
      await builder.cleanup();
    });

    test('Can get relation-list for products of a shop', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-manager/relations/api::shop.shop/products',
      });

      expect(res.body).toHaveLength(data.products.length);
      data.products.forEach((product, index) => {
        expect(res.body[index]).toStrictEqual(pick(['_id', 'id', 'name'], product));
      });
    });

    test('Can get relation-list for products of a shop and omit some results', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-manager/relations/api::shop.shop/products',
        body: {
          idsToOmit: [data.products[0].id],
        },
      });

      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toStrictEqual(pick(['_id', 'id', 'name'], data.products[1]));
    });
  });

  describe('with draftAndPublish', () => {
    const builder = createTestBuilder();

    beforeAll(async () => {
      await builder
        .addContentTypes([productWithDPModel, shopModel])
        .addFixtures(shopModel.singularName, shops)
        .addFixtures(productWithDPModel.singularName, products({ withPublished: true }))
        .build();

      strapi = await createStrapiInstance();
      rq = await createAuthRequest({ strapi });

      data.shops = await builder.sanitizedFixturesFor(shopModel.singularName, strapi);
      data.products = await builder.sanitizedFixturesFor(productWithDPModel.singularName, strapi);
    });

    afterAll(async () => {
      await strapi.destroy();
      await builder.cleanup();
    });

    test('Can get relation-list for products of a shop', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-manager/relations/api::shop.shop/products',
      });

      expect(res.body).toHaveLength(data.products.length);

      const tomatoProductRes = res.body.find(p => p.name === 'tomato');
      const appleProductRes = res.body.find(p => p.name === 'apple');

      expect(tomatoProductRes).toMatchObject(pick(['_id', 'id', 'name'], data.products[0]));
      expect(tomatoProductRes.publishedAt).toBeISODate();
      expect(appleProductRes).toStrictEqual({
        ...pick(['_id', 'id', 'name'], data.products[1]),
        publishedAt: null,
      });
    });

    test('Can get relation-list for products of a shop and omit some results', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-manager/relations/api::shop.shop/products',
        body: {
          idsToOmit: [data.products[1].id],
        },
      });

      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject(pick(['_id', 'id', 'name'], data.products[0]));
    });
  });
});
