import type { Core } from '@strapi/types';

import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import { testInTransaction } from '../../../utils/index';
import resources from './resources/index';
import { ARTICLE_UID, findArticleDb, findArticlesDb } from './utils';

describe('Document Service', () => {
  let testUtils;
  let strapi: Core.LoadedStrapi;

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
    strapi = testUtils.strapi;
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  describe('deleteMany', () => {
    it.skip(
      'delete an entire document',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ name: 'Article1' });
        const article = await strapi
          .documents(ARTICLE_UID)
          .deleteMany({ filters: { id: { $eq: articleDb.id } } });

        const articles = await findArticlesDb({
          documentId: articleDb.id,
        });

        expect(articles).toHaveLength(0);
      })
    );

    it.skip(
      'delete all documents of a locale',
      testInTransaction(async () => {
        const articleDb = await findArticlesDb({ locale: 'nl' });
        const deleted = await strapi.documents(ARTICLE_UID).deleteMany({ locale: 'nl' });

        expect(deleted).toEqual({ count: articleDb.length });

        const enArticles = await findArticlesDb({ locale: 'en' });
        const nlArticles = await findArticlesDb({ locale: 'nl' });

        expect(nlArticles).toBe(undefined);
        expect(enArticles.length).toBeGreaterThan(0);
      })
    );

    // Currently we expect .unpublish() to be used to delete a published version
    // and add a .discard() method to delete a draft version and clone it from the published version
    it.skip(
      'cannot delete with status parameter',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ name: 'Article2-Draft-EN' });
        expect(async () => {
          const article = await strapi
            .documents(ARTICLE_UID)
            .deleteMany({ filters: { id: { $eq: articleDb.id } }, status: 'draft' });
        }).rejects.toThrow();

        const articles = await findArticlesDb({ documentId: articleDb.id });

        expect(articles.length).toBe(1);
      })
    );
  });
});
