'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const { createTestBuilder } = require('api-tests/builder');

let strapi;
let rq;

const articleModel = {
  kind: 'collectionType',
  collectionName: 'articles',
  displayName: 'Article',
  singularName: 'article',
  pluralName: 'articles',
  description: '',
  name: 'Article',
  draftAndPublish: true,
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  attributes: {
    title: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
    content: {
      type: 'richtext',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
  },
};

describe('i18n - fill-from-locale', () => {
  const builder = createTestBuilder();

  beforeAll(async () => {
    await builder
      .addContentTypes([articleModel])
      .addFixtures('plugin::i18n.locale', [
        { name: 'French', code: 'fr' },
        { name: 'Italian', code: 'it' },
      ])
      .build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.db.query('plugin::i18n.locale').deleteMany({ code: { $ne: 'en' } });
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('GET /i18n/content-manager/get-fill-from-locale/api::article.article', () => {
    beforeEach(async () => {
      await strapi.db.query('api::article.article').deleteMany({});
    });

    test('returns 400 when required fields are missing', async () => {
      const res = await rq({
        method: 'GET',
        url: '/i18n/content-manager/get-fill-from-locale/api::article.article',
        qs: {
          documentId: 'doc-123',
          sourceLocale: 'en',
          targetLocale: 'fr',
          // missing collectionType
        },
      });

      expect(res.statusCode).toBe(400);
    });

    test('returns 400 when collectionType is invalid', async () => {
      const res = await rq({
        method: 'GET',
        url: '/i18n/content-manager/get-fill-from-locale/api::article.article',
        qs: {
          documentId: 'doc-123',
          sourceLocale: 'en',
          targetLocale: 'fr',
          collectionType: 'invalid-type',
        },
      });

      expect(res.statusCode).toBe(400);
    });

    test('returns 404 when document does not exist', async () => {
      const res = await rq({
        method: 'GET',
        url: '/i18n/content-manager/get-fill-from-locale/api::article.article',
        qs: {
          documentId: 'non-existent-doc-id',
          sourceLocale: 'en',
          targetLocale: 'fr',
          collectionType: 'collection-types',
        },
      });

      expect(res.statusCode).toBe(404);
    });

    test('returns data from published version when filling from locale', async () => {
      const createRes = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::article.article',
        body: {
          title: 'English Title',
          content: 'English content',
          locale: 'en',
        },
      });

      expect(createRes.statusCode).toBe(201);
      const documentId = createRes.body.data.documentId;

      await rq({
        method: 'POST',
        url: `/content-manager/collection-types/api::article.article/${documentId}/actions/publish`,
        body: { locale: 'en' },
      });

      const res = await rq({
        method: 'GET',
        url: '/i18n/content-manager/get-fill-from-locale/api::article.article',
        qs: {
          documentId,
          sourceLocale: 'en',
          targetLocale: 'fr',
          collectionType: 'collection-types',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toMatchObject({
        title: 'English Title',
        content: 'English content',
      });
      expect(res.body.data).not.toHaveProperty('documentId');
      expect(res.body.data).not.toHaveProperty('locale');
    });

    test('returns data from draft when document has no published version', async () => {
      const createRes = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::article.article',
        body: {
          title: 'Draft Only Title',
          content: 'Draft only content',
          locale: 'en',
        },
      });

      expect(createRes.statusCode).toBe(201);
      const documentId = createRes.body.data.documentId;

      const res = await rq({
        method: 'GET',
        url: '/i18n/content-manager/get-fill-from-locale/api::article.article',
        qs: {
          documentId,
          sourceLocale: 'en',
          targetLocale: 'fr',
          collectionType: 'collection-types',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toMatchObject({
        title: 'Draft Only Title',
        content: 'Draft only content',
      });
    });
  });
});
