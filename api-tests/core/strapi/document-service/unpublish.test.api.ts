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

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  describe('Unpublish', () => {
    it(
      'unpublishes all locales of a document',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ title: 'Article1-Draft-EN' });
        const article = await strapi.documents(ARTICLE_UID).unpublish(articleDb.documentId);

        const articles = await findArticlesDb({ documentId: articleDb.documentId });

        expect(articles.length).toBeGreaterThan(0);
        // Should not have any publishedAt
        articles.forEach((article) => {
          expect(article.publishedAt).toBeNull();
        });
      })
    );

    it(
      'unpublishes single locale of document',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ title: 'Article1-Draft-EN' });
        const article = await strapi.documents(ARTICLE_UID).unpublish(articleDb.documentId, {
          locales: ['en'],
        });

        const articles = await findArticlesDb({ documentId: articleDb.documentId });

        expect(articles.length).toBeGreaterThan(0);
        // Should not have any publishedAt
        articles.forEach((article) => {
          if (article.locale === 'en') {
            expect(article.publishedAt).toBeNull();
          } else {
            expect(article.publishedAt).not.toBeNull();
          }
        });
      })
    );
  });
});
