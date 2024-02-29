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

  describe('Discard Draft', () => {
    it(
      'Discard all locale drafts of a document',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ title: 'Article1-Draft-EN' });

        // Publish every draft in every locale
        await strapi.documents(ARTICLE_UID).publish(articleDb.documentId, { locale: '*' });

        // Update drafts
        await Promise.all(
          ['es', 'nl', 'en'].map((locale) =>
            strapi.documents(ARTICLE_UID).update(articleDb.documentId, {
              locale,
              data: { title: 'Draft Article' },
            })
          )
        );

        // Discard drafts
        const result = await strapi
          .documents(ARTICLE_UID)
          .discardDraft(articleDb.documentId, { locale: '*' });

        const draftArticlesDb = await findArticlesDb({
          documentId: articleDb.id,
          publishedAt: { $null: true },
        });

        // All locales should have been discarded
        expect(result.versions.length).toBe(3);
        result.versions.forEach((version) => {
          expect(version.publishedAt).toBeNull();
          // The draft title should have been discarded
          expect(version.title).not.toBe('Draft Article');
        });

        expect(draftArticlesDb.length).toBe(3);
        draftArticlesDb.forEach((article) => {
          expect(article.publishedAt).toBeNull();
          // The draft title should have been discarded
          expect(article.title).not.toBe('Draft Article');
        });
      })
    );

    it(
      'Discard a single locale of a document',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ title: 'Article1-Draft-EN' });

        // Publish every draft in every locale
        await strapi.documents(ARTICLE_UID).publish(articleDb.documentId, { locale: '*' });

        // Update drafts
        await Promise.all(
          ['es', 'nl', 'en'].map((locale) =>
            strapi.documents(ARTICLE_UID).update(articleDb.documentId, {
              locale,
              data: { title: 'Draft Article' },
            })
          )
        );

        // Discard english draft
        const result = await strapi
          .documents(ARTICLE_UID)
          .discardDraft(articleDb.id, { locale: 'en' });

        const draftArticlesDb = await findArticlesDb({
          documentId: articleDb.id,
          publishedAt: { $null: true },
        });

        // Only english locale should have been discarded
        expect(result.versions.length).toBe(1);
        result.versions.forEach((version) => {
          expect(version.locale).toBe('en');
          expect(version.publishedAt).toBeNull();
          // The draft title should have been discarded
          expect(version.title).not.toBe('Draft Article');
        });

        // Rest of locales should not have been discarded
        expect(draftArticlesDb.length).toBeGreaterThanOrEqual(3);
        draftArticlesDb.forEach((article) => {
          // The draft title should not have been discarded
          // @ts-expect-error - FIX: 'StringAttribute' and 'string' have no overlap
          if (['es', 'nl'].includes(article.locale)) {
            expect(article.title).toBe('Draft Article');
          }
        });
      })
    );
  });
});
