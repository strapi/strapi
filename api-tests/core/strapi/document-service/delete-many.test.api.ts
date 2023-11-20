import { LoadedStrapi } from '@strapi/types';
import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import { testInTransaction } from '../../../utils/index';
import resources from './resources/index';
import { ARTICLE_UID, findArticleDb, findArticlesDb } from './utils';

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

  describe('deleteMany', () => {
    it(
      'delete an entire document',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ name: 'Article1' });
        const article = await strapi
          .documents(ARTICLE_UID)
          .deleteMany({ filters: { id: { $eq: articleDb.documentId } } });

        const articles = await findArticlesDb({
          documentId: articleDb.documentId,
        });

        expect(articles).toHaveLength(0);
      })
    );

    it(
      'delete all documents of a locale',
      testInTransaction(async () => {
        const articleDb = await findArticlesDb({ locale: 'fr' });
        const deleted = await strapi.documents(ARTICLE_UID).deleteMany({ locale: 'fr' });

        expect(deleted).toEqual({ count: articleDb.length });

        const enArticles = await findArticlesDb({ locale: 'en' });
        const frArticles = await findArticlesDb({ locale: 'fr' });

        expect(frArticles).toBe(undefined);
        expect(enArticles.length).toBeGreaterThan(0);
      })
    );

    // Currently we expect .unpublish() to be used to delete a published version
    // and add a .discard() method to delete a draft version and clone it from the published version
    it(
      'cannot delete with status parameter',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ name: 'Article2-Draft-EN' });
        expect(async () => {
          const article = await strapi
            .documents(ARTICLE_UID)
            .deleteMany({ filters: { id: { $eq: articleDb.documentId } }, status: 'draft' });
        }).rejects.toThrow();

        const articles = await findArticlesDb({ documentId: articleDb.documentId });

        expect(articles.length).toBe(1);
      })
    );
  });
});
