/**
 * Simple test for the discard-drafts migration
 *
 * This test simulates the v4 to v5 upgrade scenario where published entries
 * need to have draft counterparts created.
 */

'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const modelsUtils = require('api-tests/models');

let builder;
let strapi;
let rq;

// Simple test content type without relations first
const articleModel = {
  kind: 'collectionType',
  collectionName: 'articles',
  singularName: 'article',
  pluralName: 'articles',
  displayName: 'Article',
  draftAndPublish: false, // Start without D&P (v4 state)
  pluginOptions: {
    i18n: { localized: true },
  },
  attributes: {
    title: {
      type: 'string',
      pluginOptions: { i18n: { localized: true } },
    },
    content: {
      type: 'text',
      pluginOptions: { i18n: { localized: true } },
    },
  },
};

// Test data - simulating v4 state where entries have publishedAt
const testData = {
  articles: [
    {
      documentId: 'art1',
      title: 'AI Revolution',
      content: 'The future of AI...',
      locale: 'en',
      publishedAt: new Date(),
    },
    {
      documentId: 'art1',
      title: 'Revolución de la IA',
      content: 'El futuro de la IA...',
      locale: 'es',
      publishedAt: new Date(),
    },
    {
      documentId: 'art2',
      title: 'Quantum Computing',
      content: 'Understanding quantum...',
      locale: 'en',
      publishedAt: new Date(),
    },
  ],
};

const restart = async () => {
  await strapi.destroy();
  strapi = await createStrapiInstance();
  rq = await createAuthRequest({ strapi });
};

describe('Discard Drafts Migration - Simple Test', () => {
  beforeAll(async () => {
    builder = createTestBuilder();

    await builder
      .addContentType(articleModel)
      .addFixtures('plugin::i18n.locale', [
        { name: 'en', code: 'en' },
        { name: 'es', code: 'es' },
      ])
      .addFixtures('article', testData.articles)
      .build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Migration execution', () => {
    test('should create draft entries when enabling draft and publish', async () => {
      // Verify initial state - entries exist with publishedAt (v4 state)
      const initialArticles = await strapi.db.query('api::article.article').findMany();

      expect(initialArticles).toHaveLength(3);
      expect(initialArticles.every((a) => a.publishedAt !== null)).toBe(true);

      // Enable draft and publish (this should trigger the migration)
      const articleSchema = await modelsUtils.getContentTypeSchema('article', { strapi });
      await modelsUtils.modifyContentType(
        {
          ...articleSchema,
          draftAndPublish: true,
        },
        { strapi }
      );

      // Restart to apply changes
      await restart();

      // Verify final state - should have both published and draft entries
      const finalArticles = await strapi.db.query('api::article.article').findMany();

      // Should have doubled the entries (published + draft)
      expect(finalArticles).toHaveLength(6); // 3 published + 3 draft

      const publishedArticles = finalArticles.filter((a) => a.publishedAt !== null);
      const draftArticles = finalArticles.filter((a) => a.publishedAt === null);

      expect(publishedArticles).toHaveLength(3);
      expect(draftArticles).toHaveLength(3);

      // Verify draft entries have correct properties
      draftArticles.forEach((draft) => {
        expect(draft.documentId).toBeDefined();
        expect(draft.locale).toBeDefined();
        expect(draft.publishedAt).toBeNull();
        expect(draft.title).toBeDefined();
        expect(draft.content).toBeDefined();
      });

      // Verify that published and draft entries have the same content
      const articlesByDocumentId = {};
      finalArticles.forEach((article) => {
        if (!articlesByDocumentId[article.documentId]) {
          articlesByDocumentId[article.documentId] = {};
        }
        if (!articlesByDocumentId[article.documentId][article.locale]) {
          articlesByDocumentId[article.documentId][article.locale] = [];
        }
        articlesByDocumentId[article.documentId][article.locale].push(article);
      });

      // Check that each document has both published and draft versions
      Object.values(articlesByDocumentId).forEach((versions) => {
        const locales = Object.keys(versions);
        locales.forEach((locale) => {
          const localeArticles = versions[locale];
          const published = localeArticles.find((a) => a.publishedAt !== null);
          const draft = localeArticles.find((a) => a.publishedAt === null);

          expect(published).toBeDefined();
          expect(draft).toBeDefined();
          expect(published.title).toBe(draft.title);
          expect(published.content).toBe(draft.content);
          expect(published.documentId).toBe(draft.documentId);
          expect(published.locale).toBe(draft.locale);
        });
      });
    });
  });
});
