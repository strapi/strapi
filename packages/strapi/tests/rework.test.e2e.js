'use strict';

const { createStrapiInstance } = require('../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../test/helpers/request');
const { createTestBuilder } = require('../../../test/helpers/builder');

let builder;
let strapi;
let rq;

const models = {
  article: {
    name: 'article',
    attributes: {
      name: {
        type: 'string'
      },
      question: {
        type: 'boolean',
      }
    }
  },
  product: {
    name: 'product',
    attributes: {
      category: {
        type: 'string',
        required: true,
      },
      soldout: {
        type: 'boolean',
      }
    }
  },
  comp: {
    name: 'component',
    attributes: {
      name: {
        type: 'string',
      },
    },
  }
};

const fixtures = {
  article: [
    { name: 'first article', question: true },
    { name: 'second article', question: false },
    { name: 'third article', question: false },
  ],
  product: [
    { category: 'french', soldout: true },
    { category: 'italian', soldout: false },
  ]
}

const dataMap = {};

const onFixtureCreatedFor = modelName => entries => {
  console.log('Data has been created for ', modelName);
  dataMap[modelName] = entries;
};

describe('Test suite', () => {
  beforeAll(async () => {
    builder = await createTestBuilder()
      .addContentType(models.article)
      .addContentType(models.product)
      .addFixtures(models.article.name, fixtures.article, { onCreated: onFixtureCreatedFor(models.article.name) })
      .addFixtures(models.product.name, fixtures.product, { onCreated: onFixtureCreatedFor(models.product.name) })
      .build();
    strapi = await createStrapiInstance({ ensureSuperAdmin: true });
    rq = await createAuthRequest({ strapi });
  }, 60000);

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  }, 60000);

  test('A simple test', () => {
    expect(dataMap[models.article.name]).toHaveLength(fixtures.article.length);
    expect(dataMap[models.product.name]).toHaveLength(fixtures.product.length);
  });
})
