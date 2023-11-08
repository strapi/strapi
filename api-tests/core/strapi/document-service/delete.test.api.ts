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

  describe('Delete', () => {
    it.todo(
      'delete an entire document',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ name: 'Article1' });
        const article = await strapi.documents(ARTICLE_UID).delete(articleDb.documentId);

        const articles = await findArticlesDb({ documentId: articleDb.documentId });

        expect(articles).toHaveLength(0);
      })
    );

    it.todo(
      'delete a document locale',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ name: 'Article1-Draft-FR' });
        const article = await strapi.documents(ARTICLE_UID).delete(articleDb.documentId, {
          locale: 'fr',
        });

        const articles = await findArticlesDb({ documentId: articleDb.documentId });

        expect(articles.length).toBeGreaterThan(0);
        // Should not have french locale
        articles.forEach((article) => {
          expect(article.locale).not.toBe('fr');
        });
      })
    );

    it.todo(
      'deleting a draft removes the published version too',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ name: 'Article2-Draft-EN' });
        const article = await strapi.documents(ARTICLE_UID).delete(articleDb.documentId, {
          status: 'draft',
        });

        const articles = await findArticlesDb({ documentId: articleDb.documentId });

        expect(articles.length).toBe(0);
      })
    );

    it.todo(
      'deleting a published version keeps the draft version',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ name: 'Article2-Draft-EN' });
        const article = await strapi.documents(ARTICLE_UID).delete(articleDb.documentId, {
          status: 'published',
        });

        const articles = await findArticlesDb({ documentId: articleDb.documentId });

        expect(articles.length).toBe(1);
        expect(articles[0].publishedAt).toBeNull();
      })
    );
  });
});
