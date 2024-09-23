import type { Core } from '@strapi/types';

import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import resources from './resources/index';
import { ARTICLE_UID, findArticleDb } from './utils';

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

  describe('FindFirst', () => {
    it('find first document with defaults', async () => {
      const articleDb = await findArticleDb({ title: 'Article1-Draft-EN' });

      const article = await strapi.documents(ARTICLE_UID).findFirst({});

      expect(article).not.toBeNull();
      expect(article).toMatchObject(articleDb);
    });

    it('find first document in dutch', async () => {
      const articleDb = await findArticleDb({ title: 'Article1-Draft-NL' });

      const article = await strapi.documents(ARTICLE_UID).findFirst({
        locale: 'nl',
        filters: {
          title: { $startsWith: 'Article1' },
        },
      });

      expect(article).toMatchObject(articleDb);
    });

    it('find one published document', async () => {
      const article = await strapi.documents(ARTICLE_UID).findFirst({
        status: 'published',
      });

      expect(article).toMatchObject({
        publishedAt: expect.any(String),
      });
    });

    it('find first draft document', async () => {
      const article = await strapi.documents(ARTICLE_UID).findFirst({
        status: 'draft',
      });

      expect(article).toMatchObject({
        publishedAt: null,
      });
    });
  });
});
