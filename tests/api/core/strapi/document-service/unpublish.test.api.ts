import type { Core, Modules } from '@strapi/types';

import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import { testInTransaction } from '../../../utils/index';
import resources from './resources/index';
import { ARTICLE_UID, findArticleDb, findPublishedArticlesDb } from './utils';

let strapi: Core.Strapi;

const publishArticle = async (params: Modules.Documents.ServiceParams['publish']) => {
  return strapi.documents(ARTICLE_UID).publish({ ...params });
};

const unpublishArticle = async (params: Modules.Documents.ServiceParams['unpublish']) => {
  return strapi.documents(ARTICLE_UID).unpublish({ ...params });
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

  describe('Unpublish', () => {
    testInTransaction('Can unpublish all locales of a document', async () => {
      const articleDb = await findArticleDb({ title: 'Article1-Draft-EN' });

      // Publish first all locales
      await publishArticle({ documentId: articleDb.documentId, locale: '*' });
      // Unpublish all locales
      await unpublishArticle({ documentId: articleDb.documentId, locale: '*' });

      const publishedArticles = await findPublishedArticlesDb(articleDb.documentId);

      // All locales should have been unpublished
      expect(publishedArticles.length).toBe(0);
    });

    testInTransaction('unpublish single locale of document', async () => {
      const articleDb = await findArticleDb({ title: 'Article1-Draft-EN' });

      // Publish first all locales
      await publishArticle({ documentId: articleDb.documentId, locale: '*' });
      const publishedArticlesBefore = await findPublishedArticlesDb(articleDb.documentId);

      await unpublishArticle({ documentId: articleDb.documentId, locale: 'en' });

      const publishedArticlesAfter = await findPublishedArticlesDb(articleDb.documentId);

      // Sanity check to validate there are multiple locales
      expect(publishedArticlesBefore.length).toBeGreaterThan(1);
      // Only the english locale should have been unpublished
      expect(publishedArticlesAfter.length).toBe(publishedArticlesBefore.length - 1);
      publishedArticlesAfter.forEach((article) => {
        expect(article.locale).not.toBe('en');
      });
    });

    it.todo('unpublish multiple locales of a document');
  });
});
