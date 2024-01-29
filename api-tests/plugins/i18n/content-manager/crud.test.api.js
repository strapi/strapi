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
  options: {},
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  attributes: {
    name: {
      type: 'string',
      unique: true,
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
        url: '/content-manager/collection-types/api::category.category',
        body: {
          name: 'category in korean',
        },
        qs: {
          locale: 'ko',
        },
      });

      const { statusCode, body } = res;

      expect(statusCode).toBe(200);
      expect(body).toMatchObject({
        locale: 'ko',
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
          method: 'PUT',
          url: `/content-manager/collection-types/api::category.category/${data.categories[0].id}`,
          body: {
            name: `category in ${locale}`,
            locale,
          },
          // TODO V5: in order the make the relatedEntityId work, we need need to change the logic here
          // https://github.com/strapi/strapi/blob/a1c8cbb8a8e03dae8cfd464ff586b8bd49e342fc/packages/plugins/i18n/server/src/services/content-types.ts#L58
          // With the D&P changes we would be sending a document_id so should we update the findOne to filter by document_id?
          // qs: {
          // plugins: { i18n: { relatedEntityId: data.categories[0].id } },
          // },
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.locale).toBe(locale);
      }
      const { statusCode, body } = res;

      expect(statusCode).toBe(200);
      data.categories.push(body);
    });

    test.skip('should not be able to duplicate unique field values within the same locale', async () => {
      const res = await rq({
        method: 'POST',
        url: `/content-manager/collection-types/api::category.category`,
        body: {
          name: `category in english`,
        },
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toEqual('This attribute must be unique');
    });
  });

  // V5: Fix bulk actions
  describe.skip('Bulk Delete', () => {
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
