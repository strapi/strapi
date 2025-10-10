/**
 * Create and get relations using the document service.
 */
import type { Core } from '@strapi/types';

import { createTestSetup, destroyTestSetup } from '../../../../utils/builder-helper';
import resources from '../resources/index';
import { ARTICLE_UID, CATEGORY_UID } from '../utils';
import { testInTransaction } from '../../../../utils';

describe('Document Service relations', () => {
  let testUtils;
  let strapi: Core.Strapi;

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
    strapi = testUtils.strapi;
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  describe('Create', () => {
    testInTransaction('Can create a document with relations', async () => {
      const article = await strapi.documents(ARTICLE_UID).create({
        data: {
          title: 'Article with author',
          // Connect document id
          categories: ['Cat1'],
        },
        populate: { categories: true },
      });

      // TODO: Category id should be the document id
      expect(article.categories[0].documentId).toBe('Cat1');
    });
  });

  // TODO
  describe.skip('Update', () => {
    testInTransaction('Can update a document with relations', async () => {
      const article = await strapi.documents(ARTICLE_UID).update({
        documentId: 'Article1',
        locale: 'en',
        data: {
          title: 'Article with author',
          // Connect document id
          categories: ['Cat2-En'],
        },
        populate: { categories: true },
      });

      // TODO: Category id should be the document id
      // expect(article.categories[0].documentId).toBe('Cat2-En');
    });
  });

  describe('Publish', () => {
    testInTransaction(
      'Publishing filters relations that do not have a published targeted document',
      async () => {
        const article = await strapi.documents(ARTICLE_UID).create({
          data: { title: 'Article with author', categories: ['Cat1'] },
          populate: { categories: true },
        });

        const publishedArticles = await strapi.documents(ARTICLE_UID).publish({
          documentId: article.documentId,
          populate: { categories: true },
        });
        const publishedArticle = publishedArticles.entries[0];

        expect(publishedArticles.entries.length).toBe(1);
        // Cat1 does not have a published document
        expect(publishedArticle.categories.length).toBe(0);
      }
    );

    testInTransaction(
      'Publishing connects relation to the published targeted documents',
      async () => {
        const article = await strapi.documents(ARTICLE_UID).create({
          data: { title: 'Article with author', categories: ['Cat1'] },
          populate: { categories: true },
        });

        // Publish connected category
        await strapi.documents(CATEGORY_UID).publish({ documentId: 'Cat1', locale: 'en' });

        const publishedArticles = await strapi.documents(ARTICLE_UID).publish({
          documentId: article.documentId,
          locale: article.locale,
          populate: { categories: true },
        });
        const publishedArticle = publishedArticles.entries[0];

        expect(publishedArticles.entries.length).toBe(1);
        // Cat1 has a published document
        expect(publishedArticle.categories.length).toBe(1);
        expect(publishedArticle.categories[0].documentId).toBe('Cat1');
      }
    );
  });

  describe('Discard', () => {
    testInTransaction(
      'Discarding draft brings back relations from the published version',
      async () => {
        // Create article in draft with a relation
        const draftArticle = await strapi.documents(ARTICLE_UID).create({
          data: { title: 'Article with author', categories: ['Cat1'] },
        });

        const id = draftArticle.documentId;

        // Publish documents
        await strapi.documents(CATEGORY_UID).publish({ documentId: 'Cat1' });
        await strapi.documents(ARTICLE_UID).publish({ documentId: id });

        // Update the draft article
        await strapi.documents(ARTICLE_UID).update({
          documentId: id,
          data: { title: 'Updated Article with author', categories: [] },
        });

        // Discard the draft
        const newDraftArticles = await strapi
          .documents(ARTICLE_UID)
          .discardDraft({ documentId: id, populate: ['categories'] });

        // Validate the draft is discarded
        const newDraftArticle = newDraftArticles.entries[0];

        expect(newDraftArticle.title).toBe('Article with author');
        expect(newDraftArticle.categories.length).toBe(1);
      }
    );
  });
});
