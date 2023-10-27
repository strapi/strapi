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

  describe('Middlewares', () => {
    it('Add filters', async () => {
      strapi.documents.use('findMany', (ctx, next) => {
        ctx.params.filters = { title: 'Article1-Draft-EN' };
        return next(ctx);
      });

      const articles = await strapi.documents('api::article.article').findMany({});
      expect(articles).toHaveLength(1);
    });
  });

  describe('Middleware on uid', () => {
    it('Add filters on uid', async () => {
      strapi.documents(ARTICLE_UID).use('findMany', (ctx, next) => {
        ctx.params.filters = { title: 'Article1-Draft-EN' };
        return next(ctx);
      });

      const articles = await strapi.documents(ARTICLE_UID).findMany({});
      expect(articles).toHaveLength(1);
    });
  });
});
