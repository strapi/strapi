import { LoadedStrapi } from '@strapi/types';
import './resources/types/components.d.ts';
import './resources/types/contentTypes.d.ts';
import resources from './resources/index';
import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import { testInTransaction } from '../../../utils/index';

const ARTICLE_UID = 'api::article.article';

const findArticleDb = async (where: any) => {
  return await strapi.query(ARTICLE_UID).findOne({ where });
};

const findArticlesDb = async (where: any) => {
  return await strapi.query(ARTICLE_UID).findMany({ where });
};

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

  describe('FindMany', () => {
    it(
      'selects by document name and defaults',
      testInTransaction(async () => {
        const articlesDb = await findArticlesDb({ title: 'Article1-Draft-EN' });

        const articles = await strapi.documents('api::article.article').findMany({
          filters: { title: 'Article1-Draft-EN' },
        });

        // Should return default language (en) and draft version
        expect(articles.length).toBe(1);
        expect(articles).toMatchObject(articlesDb);
      })
    );

    it(
      'selects by document name and locale',
      testInTransaction(async () => {
        // There should not be a fr article called Article1-Draft-EN
        const articles = await strapi.documents('api::article.article').findMany({
          filters: { title: 'Article1-Draft-EN', locale: 'fr' },
        });

        // Should return french locale and draft version
        expect(articles.length).toBe(1);
      })
    );

    it(
      'find french articles',
      testInTransaction(async () => {
        const articlesDb = await findArticlesDb({ title: 'Article1-Draft-EN' });

        // Question: Do we ignore the locale filter? YES (for now)
        const articles = await strapi.documents('api::article.article').findMany({
          locale: 'fr',
          status: 'draft', // 'published' | 'draft'
          // filters: { locale: { $and: ['fr', 'en'] } },
        });

        // Should return default language (en) and draft version
        expect(articles.length).toBeGreaterThan(0);
        // All articles should be in french
        articles.forEach((article) => {
          expect(article.locale).toBe('fr');
        });
      })
    );

    it(
      'find published articles',
      testInTransaction(async () => {
        const articles = await strapi.documents('api::article.article').findMany({
          filters: { status: 'published' },
        });

        // Should return default language (en) and draft version
        expect(articles.length).toBeGreaterThan(0);
        // All articles should be published
        articles.forEach((article) => {
          expect(article.publishedAt).not.toBe(null);
        });
      })
    );

    it(
      'find draft articles',
      testInTransaction(async () => {
        const articles = await strapi.documents('api::article.article').findMany({
          filters: { status: 'draft' },
        });

        // Should return default language (en) and draft version
        expect(articles.length).toBeGreaterThan(0);
        // All articles should be published
        articles.forEach((article) => {
          expect(article.publishedAt).toBe(null);
        });
      })
    );
  });
});
