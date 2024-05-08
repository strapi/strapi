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

const createCategory = async (name, locale = 'en') => {
  const res = await rq({
    method: 'POST',
    url: '/content-manager/collection-types/api::category.category',
    body: {
      name,
      locale,
    },
  });

  return res.body.data;
};

const addLocaleToDocument = async (documentId, locale, name) => {
  const res = await rq({
    method: 'PUT',
    url: `/content-manager/collection-types/api::category.category/${documentId}`,
    qs: {
      locale,
    },
    body: {
      name,
      locale,
    },
  });

  return res.body.data;
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
    // Delete all locales that have been created
    await strapi.db.query('plugin::i18n.locale').deleteMany({ code: { $ne: 'en' } });

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

      expect(statusCode).toBe(201);
      expect(body.data).toMatchObject({
        locale: 'en',
        name: 'category in english',
      });
      data.categories.push(res.body.data);
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

      expect(statusCode).toBe(201);
      expect(body.data).toMatchObject({
        locale: 'ko',
        name: 'category in korean',
      });
      data.categories.push(body.data);
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
            locale,
            relatedEntityId: data.categories[0].id,
          },
          body: {
            name: `category in ${locale}`,
            locale,
          },
        });

        expect(res.statusCode).toBe(201);
        expect(res.body.data.locale).toBe(locale);
      }
      const { statusCode, body } = res;

      expect(statusCode).toBe(201);
      data.categories.push(body.data);
    });

    test('should not be able to duplicate unique field values within the same locale', async () => {
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

  describe('Find locale', () => {
    it('Can find a locale if it exists', async () => {
      // Create locale
      const res = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::category.category',
        body: {
          name: 'categoría',
          locale: 'es-AR',
        },
      });

      // Can find it
      const locale = await rq({
        method: 'GET',
        url: `/content-manager/collection-types/api::category.category/${res.body.data.documentId}`,
        qs: {
          locale: 'es-AR',
        },
      });

      expect(locale.statusCode).toBe(200);
      expect(locale.body).toMatchObject({
        data: {
          locale: 'es-AR',
          name: 'categoría',
        },
      });
    });

    it('Not existing locale in an existing document returns empty body', async () => {
      // Create default locale
      const res = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::category.category',
        body: {
          name: 'other category in english',
          locale: 'en',
        },
      });

      // Find by another language
      const locale = await rq({
        method: 'GET',
        url: `/content-manager/collection-types/api::category.category/${res.body.data.documentId}`,
        qs: {
          locale: 'es-AR',
        },
      });

      expect(locale.statusCode).toBe(200);
      expect(locale.body.data).toMatchObject({});
    });
  });

  describe('Bulk Delete', () => {
    test('if locale is not provided, should delete only the default locale', async () => {
      const enCategory = await createCategory('Category');
      await addLocaleToDocument(enCategory.documentId, 'es-AR', 'Categoria 1');

      const res = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::category.category/actions/bulkDelete',
        body: {
          documentIds: [enCategory.documentId],
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({ count: 1 });
    });

    test('if locale is provided, should delete the document in the specified locale', async () => {
      const enCategory = await createCategory('Category 2');
      await addLocaleToDocument(enCategory.documentId, 'es-AR', 'Categoria 2');

      const res = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::category.category/actions/bulkDelete',
        qs: {
          locale: 'es-AR',
        },
        body: {
          documentIds: [enCategory.documentId],
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({ count: 1 });
    });

    test('if one document doesnt exist in the specified locale, should ignore it', async () => {
      const category1 = await createCategory('Category 3');
      await addLocaleToDocument(category1.documentId, 'es-AR', 'Categoria 3');
      const category2 = await createCategory('Category 4');

      const res = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::category.category/actions/bulkDelete',
        qs: {
          locale: 'es-AR',
        },
        body: {
          documentIds: [category1.documentId, category2.documentId],
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({ count: 1 });
    });
  });
});
