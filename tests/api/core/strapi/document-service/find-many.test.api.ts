import type { Core, Modules } from '@strapi/types';

import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import resources from './resources/index';
import { ARTICLE_UID, findArticlesDb } from './utils';

let strapi: Core.Strapi;

const findArticles = async (params: Modules.Documents.ServiceParams['findMany']) => {
  return strapi.documents(ARTICLE_UID).findMany({ ...params });
};

describe('Document Service', () => {
  let testUtils;

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
    strapi = testUtils.strapi;
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  describe('FindMany and Count', () => {
    it('Find many documents should only return drafts by default', async () => {
      const articles = await findArticles({ populate: '*' });

      articles.forEach((article) => {
        expect(article.publishedAt).toBe(null);
      });

      // expect count to be the same as findMany
      const count = await strapi.documents(ARTICLE_UID).count({});
      expect(count).toBe(articles.length);
    });

    it('Find documents by name returns default locale and draft version', async () => {
      const params = {
        filters: { title: 'Article1-Draft-EN' },
        populate: '*',
      } as const;

      const articlesDb = await findArticlesDb(params.filters);

      const articles = await findArticles(params);

      // Should return default language (en) and draft version
      expect(articles.length).toBe(1);
      expect(articles).toMatchObject(articlesDb);

      // expect count to be the same as findMany
      const count = await strapi.documents(ARTICLE_UID).count(params);
      expect(count).toBe(articles.length);
    });

    it('Find documents by name and locale', async () => {
      const params = {
        locale: 'nl',
        filters: { title: 'Article1-Draft-NL' },
        populate: '*',
      } as const;

      // There should not be a nl article called Article1-Draft-EN
      const articles = await findArticles(params);

      // Should return dutch locale and draft version
      expect(articles.length).toBe(1);

      // expect count to be the same as findMany
      const count = await strapi.documents(ARTICLE_UID).count(params);
      expect(count).toBe(articles.length);
    });

    it('Find dutch documents', async () => {
      const params = {
        locale: 'nl',
        status: 'draft', // 'published' | 'draft'
      } as const;

      const articles = await findArticles(params);

      // Should return default language (en) and draft version
      expect(articles.length).toBeGreaterThan(0);
      // All articles should be in dutch
      articles.forEach((article) => {
        expect(article.locale).toBe('nl');
        expect(article.publishedAt).toBe(null);
      });

      // expect count to be the same as findMany
      const count = await strapi.documents(ARTICLE_UID).count(params);
      expect(count).toBe(articles.length);
    });

    it('Find published documents', async () => {
      const params = {
        status: 'published',
      } as const;

      const articles = await findArticles(params);

      // Should return default language (en) and draft version
      expect(articles.length).toBeGreaterThan(0);
      // All articles should be published
      articles.forEach((article) => {
        expect(article.publishedAt).not.toBe(null);
      });

      // expect count to be the same as findMany
      const count = await strapi.documents(ARTICLE_UID).count(params);
      expect(count).toBe(articles.length);
    });

    it('Find draft documents', async () => {
      const params = {
        status: 'draft',
      } as const;

      const articles = await findArticles(params);

      // Should return default language (en) and draft version
      expect(articles.length).toBeGreaterThan(0);
      // All articles should be published
      articles.forEach((article) => {
        expect(article.publishedAt).toBe(null);
      });

      // expect count to be the same as findMany
      const count = await strapi.documents(ARTICLE_UID).count(params);
      expect(count).toBe(articles.length);
    });
  });
});
