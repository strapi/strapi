import { LoadedStrapi } from '@strapi/types';
import { FindMany } from '@strapi/types/dist/modules/documents/params/document-service';
import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import resources from './resources/index';
import { findArticlesDb } from './utils';

describe('Document Service', () => {
  let testUtils;
  let strapi: LoadedStrapi;

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
    strapi = testUtils.strapi;
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  describe('FindMany and Count', () => {
    it('find many documents should only return drafts by default', async () => {
      const params = {};
      const articles = await strapi.documents('api::article.article').findMany(params);
      articles.forEach((article) => {
        expect(article.publishedAt).toBe(null);
      });

      // expect count to be the same as findMany
      const count = await strapi.documents('api::article.article').count(params);
      expect(count).toBe(articles.length);
    });

    it('find documents by name returns default locale and draft version', async () => {
      const params = {
        filters: { title: 'Article1-Draft-EN' },
      };

      const articlesDb = await findArticlesDb(params.filters);

      const articles = await strapi.documents('api::article.article').findMany(params);

      // Should return default language (en) and draft version
      expect(articles.length).toBe(1);
      expect(articles).toMatchObject(articlesDb);

      // expect count to be the same as findMany
      const count = await strapi.documents('api::article.article').count(params);
      expect(count).toBe(articles.length);
    });

    it('find documents by name and locale', async () => {
      const params = {
        locale: 'fr',
        filters: { title: 'Article1-Draft-FR' },
      };

      // There should not be a fr article called Article1-Draft-EN
      const articles = await strapi.documents('api::article.article').findMany(params);

      // Should return french locale and draft version
      expect(articles.length).toBe(1);

      // expect count to be the same as findMany
      const count = await strapi.documents('api::article.article').count(params);
      expect(count).toBe(articles.length);
    });

    it('find french documents', async () => {
      const params = {
        locale: 'fr',
        status: 'draft', // 'published' | 'draft'
      };

      // TODO: compare this with results from findMany
      const articlesDb = await findArticlesDb({ title: 'Article1-Draft-EN' });

      const articles = await strapi.documents('api::article.article').findMany(params);

      // Should return default language (en) and draft version
      expect(articles.length).toBeGreaterThan(0);
      // All articles should be in french
      articles.forEach((article) => {
        expect(article.locale).toBe('fr');
        expect(article.publishedAt).toBe(null);
      });

      // expect count to be the same as findMany
      const count = await strapi.documents('api::article.article').count(params);
      expect(count).toBe(articles.length);
    });

    it('find published documents', async () => {
      const params = {
        status: 'published',
      };

      const articles = await strapi.documents('api::article.article').findMany(params);

      // Should return default language (en) and draft version
      expect(articles.length).toBeGreaterThan(0);
      // All articles should be published
      articles.forEach((article) => {
        expect(article.publishedAt).not.toBe(null);
      });

      // expect count to be the same as findMany
      const count = await strapi.documents('api::article.article').count(params);
      expect(count).toBe(articles.length);
    });

    it('find draft documents', async () => {
      const params = {
        status: 'draft',
      } satisfies FindMany<'api::article.article'>;

      const articles = await strapi.documents('api::article.article').findMany(params);

      // Should return default language (en) and draft version
      expect(articles.length).toBeGreaterThan(0);
      // All articles should be published
      articles.forEach((article) => {
        expect(article.publishedAt).toBe(null);
      });

      // expect count to be the same as findMany
      const count = await strapi.documents('api::article.article').count(params);
      expect(count).toBe(articles.length);
    });
  });
});
