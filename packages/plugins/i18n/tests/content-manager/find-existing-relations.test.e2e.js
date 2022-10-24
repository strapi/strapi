'use strict';

const { pick } = require('lodash/fp');

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
  displayName: 'Shop',
  singularName: 'shop',
  pluralName: 'shops',
};

const shops = [
  {
    name: 'mercato',
    locale: 'it',
  },
  {
    name: 'market',
    locale: 'en',
  },
];

const products = ({ shop: shops }) => {
  const entries = [
    {
      name: 'pomodoro',
      shops: [shops[0].id],
      locale: 'it',
    },
    {
      name: 'apple',
      shops: [shops[1].id],
      locale: 'en',
    },
  ];

  return entries;
};

describe('i18n - Find existing relations', () => {
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
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Get Italian product for italian shop filter on any locale', async () => {
    const res = await rq({
      method: 'GET',
      url: `/content-manager/relations/api::shop.shop/${data.shops[0].id}/products`,
    });

    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0]).toStrictEqual(pick(['id', 'name'], data.products[0]));
  });

  test('Get english product for english shop', async () => {
    const res = await rq({
      method: 'GET',
      url: `/content-manager/relations/api::shop.shop/${data.shops[1].id}/products`,
    });

    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0]).toStrictEqual(pick(['id', 'name'], data.products[1]));
  });
});
