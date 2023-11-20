import { LoadedStrapi } from '@strapi/types';
import './resources/types/components.d.ts';
import './resources/types/contentTypes.d.ts';
import resources from './resources/index';
import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
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
    it(
      'find first document with defaults',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ title: 'Article1-Draft-EN' });

        const article = await strapi.documents(ARTICLE_UID).findFirst({});

        expect(article).not.toBeNull();
        expect(article).toMatchObject(articleDb);
      })
    );

    it(
      'find first document in french',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ title: 'Article1-Draft-FR' });

        const article = await strapi.documents(ARTICLE_UID).findFirst({
          locale: 'fr',
          filters: {
            title: { $startsWith: 'Article1' },
          },
        });

        expect(article).toMatchObject(articleDb);
      })
    );

    it(
      'find one published document',
      testInTransaction(async () => {
        const article = await strapi.documents(ARTICLE_UID).findFirst({
          status: 'published',
        });

        expect(article).toMatchObject({
          publishedAt: expect.any(String),
        });
      })
    );

    it(
      'find first draft document',
      testInTransaction(async () => {
        const article = await strapi.documents(ARTICLE_UID).findFirst({
          status: 'draft',
        });

        expect(article).toMatchObject({
          publishedAt: null,
        });
      })
    );
  });
});
