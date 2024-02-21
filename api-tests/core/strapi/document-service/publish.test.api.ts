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

  describe('Publish', () => {
    it(
      'publish an entire document',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ title: 'Article1-Draft-EN' });

        const result = await strapi.documents(ARTICLE_UID).publish(articleDb.documentId);

        expect(result).not.toBeNull();

        const [draftArticlesDb, publishedArticlesDb] = await Promise.all([
          findArticlesDb({
            documentId: articleDb.documentId,
            publishedAt: { $null: true },
          }),
          findArticlesDb({
            documentId: articleDb.documentId,
            publishedAt: { $notNull: true },
          }),
        ]);

        // All locales should have been published
        expect(draftArticlesDb.length).toBeGreaterThan(0);
        expect(publishedArticlesDb.length).toBe(draftArticlesDb.length);
        publishedArticlesDb.forEach((article) => {
          expect(article.publishedAt).not.toBeNull();
        });
      })
    );

    it(
      'publish an already published document should discard the original document',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ title: 'Article1-Draft-EN' });

        // Publish twice should not create two new published versions,
        // the second published version should replace the first one
        await strapi.documents(ARTICLE_UID).publish(articleDb.documentId);
        await strapi.documents(ARTICLE_UID).publish(articleDb.documentId);

        const [draftArticlesDb, publishedArticlesDb] = await Promise.all([
          findArticlesDb({
            documentId: articleDb.documentId,
            publishedAt: { $null: true },
          }),
          findArticlesDb({
            documentId: articleDb.documentId,
            publishedAt: { $notNull: true },
          }),
        ]);

        // All locales should have been published
        expect(draftArticlesDb.length).toBeGreaterThan(0);
        expect(publishedArticlesDb.length).toBe(draftArticlesDb.length);
        publishedArticlesDb.forEach((article) => {
          expect(article.publishedAt).not.toBeNull();
        });
      })
    );

    it(
      'publish one locale',
      testInTransaction(async () => {
        const articlesDb = await findArticlesDb({ documentId: 'Article1' });
        const documentId = articlesDb.at(0)!.documentId;

        const result = await strapi.documents(ARTICLE_UID).publish(documentId, {
          locale: 'en', // should only publish the english locale
        });

        expect(result).not.toBeNull();

        const [draftArticlesDb, publishedArticlesDb] = await Promise.all([
          findArticlesDb({
            documentId,
            publishedAt: { $null: true },
          }),
          findArticlesDb({
            documentId,
            publishedAt: { $notNull: true },
          }),
        ]);

        // Original drafts should still be there
        expect(draftArticlesDb.length).toBe(articlesDb.length);

        // All locales should have been published
        // Only the english locale should have been published
        expect(publishedArticlesDb.length).toBe(1);
        expect(publishedArticlesDb[0].locale).toBe('en');
      })
    );
  });
});
