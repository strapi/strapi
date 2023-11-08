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

  describe('FindFirst', () => {
    it.todo(
      'find first document with defaults',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ name: 'Article1-Draft-EN' });

        const article = await strapi.documents(ARTICLE_UID).findFirst({});

        expect(article).not.toBeNull();
        expect(article).toMatchObject(articleDb);
      })
    );

    it.todo(
      'find first document in french',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ name: 'Article1-Draft-FR' });

        const article = await strapi.documents(ARTICLE_UID).findFirst({
          locale: 'fr'
          filters: {
            title: { $startsWith: 'Article1' },
          },
        });

        expect(article).toMatchObject(articleDb);
      })
    );

    it.todo(
      'find one published document',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ name: 'Article1-Published-EN' });

        const article = await strapi.documents(ARTICLE_UID).findOne({
          status: 'published',
        });

        expect(article).toMatchObject({
          publishedAt: expect.any(Date),
        });
      })
    );

    it.todo(
      'find first draft document',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ name: 'Article1-Draft-EN' });

        const article = await strapi.documents(ARTICLE_UID).findOne({
          status: 'draft',
        });

        expect(article).toMatchObject({
          publishedAt: null,
        });
      })
    );
  });
});
