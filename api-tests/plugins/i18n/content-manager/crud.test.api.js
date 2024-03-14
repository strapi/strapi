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
  draftAndPublish: true,
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
    nonLocalized: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: false,
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

      expect(statusCode).toBe(200);
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

      expect(statusCode).toBe(200);
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

        expect(res.statusCode).toBe(200);
        expect(res.body.data.locale).toBe(locale);
      }
      const { statusCode, body } = res;

      expect(statusCode).toBe(200);
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

  describe('Non localized fields', () => {
    let documentId = '';

    beforeAll(async () => {
      const res = await rq({
        method: 'POST',
        url: `/content-manager/collection-types/api::category.category`,
        body: {
          nonLocalized: `Test`,
        },
      });
      documentId = res.body.data.documentId;
    });

    test('when a new locale is created with a non localized field value all other locales should be updated in the same way', async () => {
      const updatedValue = 'New Locale Test';

      let expectedValue = updatedValue;
      for (const locale of ['ko', 'it', 'fr', 'es-AR']) {
        expectedValue = `${updatedValue} in ${locale} locale`;
        // Create a new locale in this document
        await rq({
          method: 'PUT',
          url: `/content-manager/collection-types/api::category.category/${documentId}`,
          body: {
            locale,
            nonLocalized: expectedValue,
          },
        });
      }

      const originalEntryRes = await rq({
        method: 'GET',
        url: `/content-manager/collection-types/api::category.category/${documentId}`,
      });

      // The default locale should now have the value of the last locale created
      expect(originalEntryRes.body.data.nonLocalized).toEqual(expectedValue);
    });

    test('when a non localized field value is updated in any locale, all other locales should be updated in the same way', async () => {
      const expectedValue = 'Update Test';

      await rq({
        method: 'PUT',
        url: `/content-manager/collection-types/api::category.category/${documentId}`,
        body: {
          nonLocalized: expectedValue,
        },
      });

      for (const locale of ['ko', 'it', 'fr', 'es-AR']) {
        const localeEntry = await rq({
          method: 'GET',
          url: `/content-manager/collection-types/api::category.category/${documentId}`,
          query: {
            locale,
          },
        });

        expect(localeEntry.body.data.nonLocalized).toEqual(expectedValue);
      }
    });

    let expectedValue = '';
    test('when an entry is published with a modified non localized field value, all other drafts should be updated in the same way', async () => {
      expectedValue = 'Publish Test';

      await rq({
        method: 'POST',
        url: `/content-manager/collection-types/api::category.category/${documentId}/actions/publish`,
        body: {
          nonLocalized: expectedValue,
        },
      });

      for (const locale of ['ko', 'it', 'fr', 'es-AR']) {
        const localeEntry = await rq({
          method: 'GET',
          url: `/content-manager/collection-types/api::category.category/${documentId}`,
          query: {
            locale,
          },
        });

        expect(localeEntry.body.data.nonLocalized).toEqual(expectedValue);
      }
    });

    test('when a published version is unpublished in a way that updates the draft non localized field value (discradDraft), all other locales should be updated in the same way', async () => {
      // Firstly update the draft version so it differs from the published version
      await rq({
        method: 'PUT',
        url: `/content-manager/collection-types/api::category.category/${documentId}`,
        body: {
          nonLocalized: 'NA',
        },
      });

      // Now unpublish the published version of the default locale, specifying
      // that we should discard the draft version
      await rq({
        method: 'POST',
        url: `/content-manager/collection-types/api::category.category/${documentId}/actions/unpublish`,
        body: {
          discardDraft: true,
        },
      });

      for (const locale of ['ko', 'it', 'fr', 'es-AR']) {
        const localeEntry = await rq({
          method: 'GET',
          url: `/content-manager/collection-types/api::category.category/${documentId}`,
          query: {
            locale,
          },
        });

        expect(localeEntry.body.data.nonLocalized).toEqual(expectedValue);
      }
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
      expect(body.data).toMatchObject({ count: 1 });
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
      expect(body.data).toMatchObject({ count: 1 });
      data.categories.shift();
    });
  });
});
