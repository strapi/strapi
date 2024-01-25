/**
 * Create and get relations using the document service.
 */
import { LoadedStrapi } from '@strapi/types';
import { createTestSetup, destroyTestSetup } from '../../../../utils/builder-helper';
import resources from '../resources/index';
import { ARTICLE_UID, findArticleDb, AUTHOR_UID, findAuthorDb } from '../utils';

describe.skip('Document Service relations', () => {
  let testUtils;
  let strapi: LoadedStrapi;

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
    strapi = testUtils.strapi;
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  // TODO: Test for all type of relations
  describe('FindOne', () => {
    it('Can populate top level relations', async () => {
      const article = await strapi
        .documents('api::article.article')
        .findOne('Article1', { locale: 'en', populate: { categories: true } });

      // TODO: Category id should be the document id
      // expect(article.categories[0].id).toBe('Cat1-En');
    });

    it.todo('Can populate a nested relation');

    it.todo('Can populate a relation in component');

    it.todo('Can filter by a relation id ');

    it.todo('Can filter by a relation attribute');

    it.todo('Can select fields of relation');
  });

  describe('Create', () => {
    it('Can create a document with relations', async () => {
      const article = await strapi.documents('api::article.article').create({
        data: {
          title: 'Article with author',
          // Connect document id
          categories: ['Cat1-En'],
        },
        populate: { categories: true },
      });

      // TODO: Category id should be the document id
      // expect(article.categories[0].id).toBe('Cat1-En');
    });
  });

  describe('Update', () => {
    it('Can update a document with relations', async () => {
      const article = await strapi.documents('api::article.article').update('Article1', {
        locale: 'en',
        data: {
          title: 'Article with author',
          // Connect document id
          categories: ['Cat2-En'],
        },
        populate: { categories: true },
      });

      // TODO: Category id should be the document id
      // expect(article.categories[0].id).toBe('Cat2-En');
    });
  });
});
