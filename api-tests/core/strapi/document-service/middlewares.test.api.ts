import { LoadedStrapi } from '@strapi/types';
import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import resources from './resources/index';
import { ARTICLE_UID } from './utils';

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
        // @ts-expect-error - this is using a generic ContentType.UID , so article attributes are not typed
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

  describe('Middleware priority', () => {
    it('Add middlewares with different priority', async () => {
      const ARTICLE_1 = 'Article1-Draft-EN';
      const ARTICLE_2 = 'Article2-Draft-EN';

      strapi.documents(ARTICLE_UID).use(
        'findMany',
        (ctx, next) => {
          ctx.params.filters = { title: ARTICLE_1 };
          return next(ctx);
        },
        { priority: strapi.documents.middlewares.priority.LOW }
      );

      strapi.documents(ARTICLE_UID).use(
        'findMany',
        (ctx, next) => {
          ctx.params.filters = { title: ARTICLE_2 };
          return next(ctx);
        },
        { priority: strapi.documents.middlewares.priority.HIGH }
      );

      // Higher priority middleware should be called first, even if it's added after
      const articles = await strapi.documents(ARTICLE_UID).findMany({});

      expect(articles).toHaveLength(1);
      expect(articles[0].title).toEqual(ARTICLE_1);
    });
  });
});
