/**
 * Create and get relations using the document service.
 */
import { LoadedStrapi } from '@strapi/types';
import { createTestSetup, destroyTestSetup } from '../../../../utils/builder-helper';
import resources from '../resources/index';
import { ARTICLE_UID, CATEGORY_UID } from '../utils';
import { testInTransaction } from '../../../../utils';

describe('Document Service relations', () => {
  let testUtils;
  let strapi: LoadedStrapi;

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
    strapi = testUtils.strapi;
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  describe('Create', () => {
    it('Can create a document with relations', async () => {
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
    it('Can update a document with relations', async () => {
      const article = await strapi.documents(ARTICLE_UID).update('Article1', {
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
    it(
      'Publishing filters relations that do not have a published targeted document',
      testInTransaction(async () => {
        const article = await strapi.documents(ARTICLE_UID).create({
          data: { title: 'Article with author', categories: ['Cat1'] },
          populate: { categories: true },
        });

        const publishedArticles = await strapi.documents(ARTICLE_UID).publish(article.documentId, {
          populate: { categories: true },
        });
        const publishedArticle = publishedArticles.versions[0];

        expect(publishedArticles.versions.length).toBe(1);
        // Cat1 does not have a published document
        expect(publishedArticle.categories.length).toBe(0);
      })
    );

    it(
      'Publishing connects relation to the published targeted documents',
      testInTransaction(async () => {
        const article = await strapi.documents(ARTICLE_UID).create({
          data: { title: 'Article with author', categories: ['Cat1'] },
          populate: { categories: true },
        });

        // Publish connected category
        await strapi.documents(CATEGORY_UID).publish('Cat1', { locale: 'en' });

        const publishedArticles = await strapi.documents(ARTICLE_UID).publish(article.documentId, {
          locale: article.locale,
          populate: { categories: true },
        });
        const publishedArticle = publishedArticles.versions[0];

        expect(publishedArticles.versions.length).toBe(1);
        // Cat1 has a published document
        expect(publishedArticle.categories.length).toBe(1);
        expect(publishedArticle.categories[0].documentId).toBe('Cat1');
      })
    );
  });

  describe('Discard', () => {
    it('Discarding draft brings back relations from the published version', async () => {
      // Create article in draft with a relation
      const draftArticle = await strapi.documents(ARTICLE_UID).create({
        data: { title: 'Article with author', categories: ['Cat1'] },
      });

      const id = draftArticle.documentId;

      // Publish documents
      await strapi.documents(CATEGORY_UID).publish('Cat1');
      await strapi.documents(ARTICLE_UID).publish(id);

      // Update the draft article
      await strapi
        .documents(ARTICLE_UID)
        .update(id, { data: { title: 'Updated Article with author', categories: [] } });

      // Discard the draft
      const newDraftArticles = await strapi
        .documents(ARTICLE_UID)
        .discardDraft(id, { populate: ['categories'] });

      // Validate the draft is discarded
      const newDraftArticle = newDraftArticles.versions[0];

      expect(newDraftArticle.title).toBe('Article with author');
      expect(newDraftArticle.categories.length).toBe(1);
    });
  });

  describe('Publish', () => {
    it(
      'Publishing filters relations that do not have a published targeted document',
      testInTransaction(async () => {
        const article = await strapi.documents(ARTICLE_UID).create({
          data: { title: 'Article with author', categories: ['Cat1'] },
          populate: { categories: true },
        });

        const publishedArticles = await strapi.documents(ARTICLE_UID).publish(article.id, {
          populate: { categories: true },
        });
        const publishedArticle = publishedArticles.versions[0];

        expect(publishedArticles.versions.length).toBe(1);
        // Cat1 does not have a published document
        expect(publishedArticle.categories.length).toBe(0);
      })
    );

    it(
      'Publishing connects relation to the published targeted documents',
      testInTransaction(async () => {
        const article = await strapi.documents(ARTICLE_UID).create({
          data: { title: 'Article with author', categories: ['Cat1'] },
          populate: { categories: true },
        });

        // Publish connected category
        await strapi.documents(CATEGORY_UID).publish('Cat1', { locale: 'en' });

        const publishedArticles = await strapi.documents(ARTICLE_UID).publish(article.id, {
          locale: article.locale,
          populate: { categories: true },
        });
        const publishedArticle = publishedArticles.versions[0];

        expect(publishedArticles.versions.length).toBe(1);
        // Cat1 has a published document
        expect(publishedArticle.categories.length).toBe(1);
        expect(publishedArticle.categories[0].id).toBe('Cat1');
      })
    );
  });

  describe('Discard', () => {
    it('Discarding draft brings back relations from the published version', async () => {
      // Create article in draft with a relation
      const draftArticle = await strapi.documents(ARTICLE_UID).create({
        data: { title: 'Article with author', categories: ['Cat1'] },
      });

      const id = draftArticle.id as string;

      // Publish documents
      await strapi.documents(CATEGORY_UID).publish('Cat1');
      await strapi.documents(ARTICLE_UID).publish(id);

      // Update the draft article
      await strapi
        .documents(ARTICLE_UID)
        .update(id, { data: { title: 'Updated Article with author', categories: [] } });

      // Discard the draft
      const newDraftArticles = await strapi
        .documents(ARTICLE_UID)
        .discardDraft(id, { populate: ['categories'] });

      // Validate the draft is discarded
      const newDraftArticle = newDraftArticles.versions[0];

      expect(newDraftArticle.title).toBe('Article with author');
      expect(newDraftArticle.categories.length).toBe(1);
    });
  });
});
