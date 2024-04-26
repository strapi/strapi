import type { Core } from '@strapi/types';

import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import { testInTransaction } from '../../../utils/index';
import resources from './resources/index';
import { ARTICLE_UID, findArticleDb, findArticlesDb } from './utils';

describe('Document Service', () => {
  let testUtils;
  let strapi: Core.Strapi;

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
    strapi = testUtils.strapi;
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  describe('Discard Draft', () => {
    let documentId: string;

    beforeAll(async () => {
      const articleDb = await findArticleDb({ title: 'Article1-Draft-EN' });
      documentId = articleDb.documentId;

      // Publish every draft in every locale
      await strapi.documents(ARTICLE_UID).publish({ documentId, locale: '*' });

      // Update drafts
      await Promise.all(
        ['es', 'nl', 'en'].map((locale) =>
          strapi.documents(ARTICLE_UID).update({
            documentId,
            locale,
            data: {
              // @ts-expect-error articles do have titles
              title: 'Draft Article',
            },
          })
        )
      );
    });

    testInTransaction('Discard all locale drafts of a document', async () => {
      // Discard drafts
      const result = await strapi.documents(ARTICLE_UID).discardDraft({ documentId, locale: '*' });

      const draftArticlesDb = await findArticlesDb({
        documentId,
        publishedAt: { $null: true },
      });

      // All locales should have been discarded
      expect(result.entries.length).toBe(3);
      result.entries.forEach((version) => {
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
    });

    testInTransaction('Discard a single locale of a document', async () => {
      // Discard english draft
      const result = await strapi.documents(ARTICLE_UID).discardDraft({ documentId, locale: 'en' });

      const draftArticlesDb = await findArticlesDb({
        documentId,
        publishedAt: { $null: true },
      });

      // Only english locale should have been discarded
      expect(result.entries.length).toBe(1);
      result.entries.forEach((version) => {
        expect(version.locale).toBe('en');
        expect(version.publishedAt).toBeNull();
        // The draft title should have been discarded
        expect(version.title).not.toBe('Draft Article');
      });

      // Rest of locales should not have been discarded
      expect(draftArticlesDb.length).toBeGreaterThanOrEqual(3);
      draftArticlesDb.forEach((article) => {
        // The draft title should not have been discarded
        if (['es', 'nl'].includes(article.locale)) {
          expect(article.title).toBe('Draft Article');
        }
      });
    });

    testInTransaction('Discard multiple locales of a document', async () => {
      // Discard 'en' and 'nl' drafts
      const localesToDiscard = ['en', 'nl'];
      const result = await strapi
        .documents(ARTICLE_UID)
        .discardDraft({ documentId, locale: localesToDiscard });

      const draftArticlesDb = await findArticlesDb({
        documentId,
        publishedAt: { $null: true },
      });

      // 'en' and 'nl' drafts should have been discarded
      expect(result.entries.length).toBe(2);
      result.entries.forEach((version) => {
        expect(localesToDiscard).toContain(version.locale);
        expect(version.publishedAt).toBeNull();
        // The draft title should have been discarded
        expect(version.title).not.toBe('Draft Article');
      });

      // Rest of locales should not have been discarded
      expect(draftArticlesDb.length).toBeGreaterThanOrEqual(3);
      draftArticlesDb.forEach((article) => {
        // The draft title should not have been discarded
        if (['es'].includes(article.locale)) {
          expect(article.title).toBe('Draft Article');
        }
      });
    });
  });
});
