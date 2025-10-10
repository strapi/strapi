'use strict';

const { pick } = require('lodash/fp');

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

let strapi;
let rq;
const data = {
  products: [],
  shops: [],
};

const productModel = {
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  attributes: {
    name: {
      type: 'string',
    },
  },
  draftAndPublish: false,
  displayName: 'Product',
  singularName: 'product',
  pluralName: 'products',
  description: '',
  collectionName: '',
};

const shopModel = {
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
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
  draftAndPublish: false,
  displayName: 'Shop',
  singularName: 'shop',
  pluralName: 'shops',
};

const shops = [
  {
    name: 'market',
    locale: 'en',
  },
  {
    name: 'mercato',
    locale: 'it',
  },
];

const products = ({ shop }) => {
  const shops = [shop[0].id];

  const entries = [
    {
      name: 'pomodoro',
      shops,
      locale: 'it',
    },
    {
      name: 'apple',
      shops,
      locale: 'en',
    },
  ];

  return entries;
};

describe('i18n - Find available relations', () => {
  const builder = createTestBuilder();

  beforeAll(async () => {
    await builder
      .addContentTypes([productModel, shopModel])
      .addFixtures('plugin::i18n.locale', [
        {
          name: 'It',
          code: 'it',
        },
      ])
      .addFixtures(shopModel.singularName, shops)
      .addFixtures(productModel.singularName, products)
      .build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    data.shops = await builder.sanitizedFixturesFor(shopModel.singularName, strapi);
    data.products = await builder.sanitizedFixturesFor(productModel.singularName, strapi);
  });

  afterAll(async () => {
    // Delete all locales that have been created
    await strapi.db.query('plugin::i18n.locale').deleteMany({ code: { $ne: 'en' } });

    await strapi.destroy();
    await builder.cleanup();
  });

  test('Can filter on default locale', async () => {
    const res = await rq({
      method: 'GET',
      url: '/content-manager/relations/api::shop.shop/products',
      qs: { locale: 'en', status: 'published' },
    });

    const expectedObj = {
      ...pick(['id', 'name', 'publishedAt', 'documentId', 'locale', 'updatedAt'], data.products[1]),
    };
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0]).toStrictEqual(expectedObj);
  });

  test('Can filter on any locale', async () => {
    const res = await rq({
      method: 'GET',
      url: '/content-manager/relations/api::shop.shop/products',
      qs: { locale: 'it', status: 'published' },
    });

    const expectedObj = {
      ...pick(['id', 'name', 'publishedAt', 'documentId', 'locale', 'updatedAt'], data.products[0]),
    };
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0]).toStrictEqual(expectedObj);
  });
});
