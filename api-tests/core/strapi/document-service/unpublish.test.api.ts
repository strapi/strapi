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

const findPublishedArticlesDb = async (documentId) => {
  return findArticlesDb({ documentId, publishedAt: { $notNull: true } });
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
      'unpublish all locales of a document',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ title: 'Article1-Draft-EN' });

        // Publish first all locales
        await strapi.documents(ARTICLE_UID).publish(articleDb.documentId);
        // Unpublish all locales
        await strapi.documents(ARTICLE_UID).unpublish(articleDb.documentId);

        const publishedArticles = await findPublishedArticlesDb(articleDb.documentId);

        // All locales should have been unpublished
        expect(publishedArticles.length).toBe(0);
      })
    );

    it.only(
      'unpublish single locale of document',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ title: 'Article1-Draft-EN' });

        // Publish first all locales
        await strapi.documents(ARTICLE_UID).publish(articleDb.documentId);
        const publishedArticlesBefore = await findPublishedArticlesDb(articleDb.documentId);

        await strapi.documents(ARTICLE_UID).unpublish(articleDb.documentId, {
          locale: 'en',
        });

        const publishedArticlesAfter = await findPublishedArticlesDb(articleDb.documentId);

        // Sanity check to validate there are multiple locales
        expect(publishedArticlesBefore.length).toBeGreaterThan(1);
        // Only the english locale should have been unpublished
        expect(publishedArticlesAfter.length).toBe(publishedArticlesBefore.length - 1);
        publishedArticlesAfter.forEach((article) => {
          expect(article.locale).not.toBe('en');
        });
      })
    );
  });
});
