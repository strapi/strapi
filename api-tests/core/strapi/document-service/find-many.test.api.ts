import { LoadedStrapi } from '@strapi/types';
import './resources/types/components.d.ts';
import './resources/types/contentTypes.d.ts';
import resources from './resources/index';
import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';

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

  describe('FindMany', () => {
    it('find many selects by document name', async () => {
      const articlesDb = await findArticlesDb({ title: 'Article1-Draft-EN' });

      const articles = await strapi.documents('api::article.article').findMany({
        filters: { title: 'Article1-Draft-EN' },
      });

      expect(articles.length).toBe(1);
      expect(articles).toMatchObject(articlesDb);
    });
  });
});
