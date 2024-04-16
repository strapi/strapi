import type { Core } from '@strapi/types';

import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import resources from './resources/index';
import { ARTICLE_UID } from './utils';

describe('Document Service', () => {
  let testUtils;
  let strapi: Core.Strapi;

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
    strapi = testUtils.strapi;
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  describe('Middlewares', () => {
    it('Add filters', async () => {
      strapi.documents.use((ctx, next) => {
        if (ctx.action === 'findMany') {
          ctx.params.filters = { title: 'Article1-Draft-EN' };
        }

        return next();
      });

      const articles = await strapi.documents('api::article.article').findMany();

      expect(articles).toHaveLength(1);
    });
  });
});
