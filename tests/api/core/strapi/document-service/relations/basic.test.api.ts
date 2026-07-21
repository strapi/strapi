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

  describe('Populate sort', () => {
    // https://github.com/strapi/strapi/issues/26359

    const categoryNames = (article: { categories: Array<{ name: string }> }) =>
      article.categories.map((category) => category.name);

    testInTransaction.each([
      ['object', { sort: { name: 'asc' } }],
      ['string', { sort: 'name' }],
    ])('sorts manyToMany populated relations (%s sort)', async (_label, populateCategories) => {
      const article = await strapi.documents(ARTICLE_UID).create({
        locale: 'en',
        data: {
          title: 'Populate sort test',
          categories: ['Cat2', 'Cat1'],
        },
        populate: {
          categories: populateCategories,
        },
      });

      expect(categoryNames(article)).toEqual(['Cat1-EN', 'Cat2-EN']);
    });

    testInTransaction('sorts manyToMany populated relations on findMany', async () => {
      await strapi.documents(ARTICLE_UID).create({
        locale: 'en',
        data: {
          title: 'Populate sort findMany test',
          categories: ['Cat2', 'Cat1'],
        },
      });

      const [article] = await strapi.documents(ARTICLE_UID).findMany({
        locale: 'en',
        filters: { title: 'Populate sort findMany test' },
        populate: { categories: { sort: 'name' } },
      });

      expect(categoryNames(article)).toEqual(['Cat1-EN', 'Cat2-EN']);
    });

    testInTransaction('sorts manyToMany populated relations via db.query orderBy', async () => {
      await strapi.documents(ARTICLE_UID).create({
        locale: 'en',
        data: {
          title: 'Populate sort db query test',
          categories: ['Cat2', 'Cat1'],
        },
      });

      const article = await strapi.db.query(ARTICLE_UID).findOne({
        where: { title: 'Populate sort db query test', locale: 'en' },
        populate: { categories: { orderBy: { name: 'asc' } } },
      });

      expect(categoryNames(article)).toEqual(['Cat1-EN', 'Cat2-EN']);
    });

    testInTransaction('sorts manyToMany populated relations in descending order', async () => {
      const article = await strapi.documents(ARTICLE_UID).create({
        locale: 'en',
        data: {
          title: 'Populate sort desc test',
          categories: ['Cat2', 'Cat1'],
        },
        populate: {
          categories: { sort: { name: 'desc' } },
        },
      });

      expect(categoryNames(article)).toEqual(['Cat2-EN', 'Cat1-EN']);
    });

    // https://github.com/strapi/strapi/issues/26550
    // GraphQL's SortArg defaults to `[]`, so nested relations are queried with an empty
    // `orderBy`. An empty orderBy must NOT be treated as an explicit sort, otherwise the
    // join-table connect/UI order is dropped (v5.47.0 regression from #26361).
    testInTransaction.each([
      ['empty array', []],
      ['empty object', {}],
    ])(
      'preserves manyToMany connect order when nested orderBy is %s',
      async (_label, emptyOrderBy) => {
        await strapi.documents(ARTICLE_UID).create({
          locale: 'en',
          data: {
            title: 'Populate empty orderBy test',
            categories: ['Cat2', 'Cat1'],
          },
        });

        const article = await strapi.db.query(ARTICLE_UID).findOne({
          where: { title: 'Populate empty orderBy test', locale: 'en' },
          populate: { categories: { orderBy: emptyOrderBy } },
        });

        expect(categoryNames(article)).toEqual(['Cat2-EN', 'Cat1-EN']);
      }
    );

    testInTransaction(
      'reverses manyToMany connect order with ordering via db.query when sort is omitted',
      async () => {
        await strapi.documents(ARTICLE_UID).create({
          locale: 'en',
          data: {
            title: 'Populate sort ordering test',
            categories: ['Cat2', 'Cat1'],
          },
        });

        const article = await strapi.db.query(ARTICLE_UID).findOne({
          where: { title: 'Populate sort ordering test', locale: 'en' },
          populate: { categories: { ordering: 'desc' } },
        });

        expect(categoryNames(article)).toEqual(['Cat1-EN', 'Cat2-EN']);
      }
    );

    testInTransaction('sorts oneToMany joinColumn populated relations', async () => {
      const parent = await strapi.documents(CATEGORY_UID).create({
        locale: 'en',
        data: { name: 'Parent-EN' },
      });

      await strapi.documents(CATEGORY_UID).create({
        locale: 'en',
        data: { name: 'SubB-EN', parentCategory: parent.documentId },
      });

      await strapi.documents(CATEGORY_UID).create({
        locale: 'en',
        data: { name: 'SubA-EN', parentCategory: parent.documentId },
      });

      const loaded = await strapi.documents(CATEGORY_UID).findOne({
        documentId: parent.documentId,
        locale: 'en',
        populate: { subcategories: { sort: 'name' } },
      });

      expect(loaded.subcategories.map((category) => category.name)).toEqual(['SubA-EN', 'SubB-EN']);
    });

    testInTransaction('sorts nested populate at multiple levels', async () => {
      const parent = await strapi.documents(CATEGORY_UID).create({
        locale: 'en',
        data: { name: 'Parent-EN' },
      });

      await strapi.documents(CATEGORY_UID).create({
        locale: 'en',
        data: { name: 'SubB-EN', parentCategory: parent.documentId },
      });

      await strapi.documents(CATEGORY_UID).create({
        locale: 'en',
        data: { name: 'SubA-EN', parentCategory: parent.documentId },
      });

      const article = await strapi.documents(ARTICLE_UID).create({
        locale: 'en',
        data: {
          title: 'Populate sort nested populate test',
          categories: [parent.documentId],
        },
        populate: {
          categories: {
            sort: 'name',
            populate: {
              subcategories: { sort: 'name' },
            },
          },
        },
      });

      expect(categoryNames(article)).toEqual(['Parent-EN']);
      expect(article.categories[0].subcategories.map((category) => category.name)).toEqual([
        'SubA-EN',
        'SubB-EN',
      ]);
    });

    testInTransaction(
      'applies nested sort before limit on populated relations via db.query',
      async () => {
        await strapi.documents(ARTICLE_UID).create({
          locale: 'en',
          data: {
            title: 'Populate sort limit test',
            categories: ['Cat2', 'Cat1'],
          },
        });

        const article = await strapi.db.query(ARTICLE_UID).findOne({
          where: { title: 'Populate sort limit test', locale: 'en' },
          populate: {
            categories: {
              orderBy: { name: 'asc' },
              limit: 1,
            },
          },
        });

        expect(categoryNames(article)).toEqual(['Cat1-EN']);
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
