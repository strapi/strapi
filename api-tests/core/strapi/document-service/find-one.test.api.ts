import { LoadedStrapi } from '@strapi/types';
import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import resources from './resources/index';
import { ARTICLE_UID, findArticleDb, AUTHOR_UID, findAuthorDb } from './utils';

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

  describe('FindOne', () => {
    it('find one document returns defaults', async () => {
      const articleDb = await findArticleDb({ title: 'Article1-Draft-EN' });

      const article = await strapi.documents(ARTICLE_UID).findOne(articleDb.id, {});

      expect(article).toMatchObject(articleDb);
    });

    it('find one document in english', async () => {
      const articleDb = await findArticleDb({ title: 'Article1-Draft-EN' });

      const article = await strapi.documents(ARTICLE_UID).findOne(articleDb.id, {
        locale: 'en',
      });

      expect(article).toMatchObject(articleDb);
    });

    it('find one published document', async () => {
      const articleDb = await findArticleDb({ title: 'Article2-Published-EN' });

      const article = await strapi.documents(ARTICLE_UID).findOne(articleDb.id, {
        status: 'published',
      });

      expect(article).toMatchObject(articleDb);
    });

    it('find one draft document', async () => {
      const articleDb = await findArticleDb({ title: 'Article1-Draft-EN' });

      const article = await strapi.documents(ARTICLE_UID).findOne(articleDb.id, {
        status: 'draft',
      });

      expect(article).toMatchObject(articleDb);
    });

    it('ignores locale parameter on non-localized content type', async () => {
      const authorDb = await findAuthorDb({ name: 'Author1-Draft' });

      // Locale should be ignored on non-localized content types
      const author = await strapi.documents(AUTHOR_UID).findOne(authorDb.id, {
        locale: 'en',
      });

      expect(author).toMatchObject(authorDb);
    });

    it.todo('ignores pagination parameters');
  });
});
