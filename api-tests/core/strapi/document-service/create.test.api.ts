import { LoadedStrapi } from '@strapi/types';
import './resources/types/components.js';
import './resources/types/contentTypes.js';
import resources from './resources/index';
import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper.js';
import { testInTransaction } from '../../../utils/index';

const ARTICLE_UID = 'api::article.article';

const findArticleDb = async (where: any) => {
  return await strapi.query(ARTICLE_UID).findOne({ where });
};

const findArticlesDb = async (where: any) => {
  return await strapi.query(ARTICLE_UID).findMany({ where });
};

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

  describe('Creates', () => {
    it(
      'can create a document',
      testInTransaction(async () => {
        const article = await strapi.documents(ARTICLE_UID).create({
          data: { title: 'Article' },
        });

        // verify that the returned document was updated
        expect(article).toMatchObject({
          title: 'Article',
          locale: 'en', // default locale
          publishedAt: null, // should be a draft
        });
      })
    );

    it(
      'can create an article in french',
      testInTransaction(async () => {
        const article = await strapi.documents(ARTICLE_UID).create({
          data: { title: 'Article', locale: 'fr' },
        });

        // verify that the returned document was updated
        expect(article).toMatchObject({
          title: 'Article',
          locale: 'fr', // selected locale
          publishedAt: null, // should be a draft
        });
      })
    );

    it.todo(
      'can not directly create a published document',
      testInTransaction(async () => {
        const article = await strapi.documents(ARTICLE_UID).create({
          data: { title: 'Article', locale: 'fr', status: 'published' },
        });

        // TODO: Should throw an error
      })
    );

    it(
      'publishedAt attribute is ignored',
      testInTransaction(async () => {
        const article = await strapi.documents(ARTICLE_UID).create({
          data: { title: 'Article', publishedAt: new Date() },
        });

        // verify that the returned document was updated
        expect(article).toMatchObject({
          title: 'Article',
          publishedAt: null, // should be a draft
        });
      })
    );
  });
});
