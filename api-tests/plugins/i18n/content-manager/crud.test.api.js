'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const { createTestBuilder } = require('api-tests/builder');

let strapi;
let rq;

const categoryModel = {
  kind: 'collectionType',
  collectionName: 'categories',
  displayName: 'Category',
  singularName: 'category',
  pluralName: 'categories',
  description: '',
  name: 'Category',
  options: {
    draftAndPublish: false,
  },
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  attributes: {
    name: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
  },
};

const data = {
  categories: [],
};

describe('i18n - Content API', () => {
  const builder = createTestBuilder();

  beforeAll(async () => {
    await builder
      .addContentTypes([categoryModel])
      .addFixtures('plugin::i18n.locale', [
        { name: 'Korean', code: 'ko' },
        { name: 'Italian', code: 'it' },
        { name: 'French', code: 'fr' },
        { name: 'Spanish (Argentina)', code: 'es-AR' },
      ])
      .build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Create', () => {
    test('default locale', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::category.category',
        body: {
          name: 'category in english',
        },
      });

      const { statusCode, body } = res;

      expect(statusCode).toBe(200);
      expect(body).toMatchObject({
        locale: 'en',
        localizations: [],
        name: 'category in english',
      });
      data.categories.push(res.body);
    });

    test('non-default locale', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::category.category?plugins[i18n][locale]=ko',
        body: {
          name: 'category in korean',
        },
      });

      const { statusCode, body } = res;

      expect(statusCode).toBe(200);
      expect(body).toMatchObject({
        locale: 'ko',
        localizations: [],
        name: 'category in korean',
      });
      data.categories.push(res.body);
    });

    // This tests is sensible to foreign keys deadlocks
    // foreign keys deadlock example: https://gist.github.com/roustem/db2398aa38be0cc88364
    test('all related locales', async () => {
      let res;
      for (const locale of ['ko', 'it', 'fr', 'es-AR']) {
        res = await rq({
          method: 'POST',
          url: `/content-manager/collection-types/api::category.category`,
          qs: {
            plugins: { i18n: { locale, relatedEntityId: data.categories[0].id } },
          },
          body: {
            name: `category in ${locale}`,
          },
        });
        expect(res.statusCode).toBe(200);
      }

      const { statusCode, body } = res;

      expect(statusCode).toBe(200);
      expect(body.localizations).toHaveLength(4);
      data.categories.push(res.body);
    });
  });

  describe('Bulk Delete', () => {
    test('default locale', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::category.category/actions/bulkDelete',
        body: {
          ids: [data.categories[0].id],
        },
      });

      const { statusCode, body } = res;

      expect(statusCode).toBe(200);
      expect(body).toMatchObject({ count: 1 });
      data.categories.shift();
    });

    test('non-default locale', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::category.category/actions/bulkDelete',
        body: {
          ids: [data.categories[0].id],
        },
      });

      const { statusCode, body } = res;

      expect(statusCode).toBe(200);
      expect(body).toMatchObject({ count: 1 });
      data.categories.shift();
    });
  });
});
