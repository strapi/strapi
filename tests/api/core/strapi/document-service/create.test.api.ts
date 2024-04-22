import type { Core } from '@strapi/types';

import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import { testInTransaction } from '../../../utils/index';
import resources from './resources/index';
import { ARTICLE_UID, findArticlesDb, AUTHOR_UID } from './utils';

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

  describe('Creates', () => {
    testInTransaction('can create a document', async () => {
      const article = await strapi.documents(ARTICLE_UID).create({
        data: { title: 'Article' },
      });

      // verify that the returned document was updated
      expect(article).toMatchObject({
        title: 'Article',
        locale: 'en', // default locale
        publishedAt: null, // should be a draft
      });

      const articles = await findArticlesDb({ documentId: article.documentId });
      // Only one article should have been created
      expect(articles).toHaveLength(1);
    });

    testInTransaction('can create document with components', async () => {
      const article = await strapi.documents(ARTICLE_UID).create({
        data: {
          title: 'Article',
          comp: {
            text: 'comp-1',
          },
          dz: [
            {
              __component: 'article.dz-comp',
              name: 'dz-comp-1',
            },
          ],
        },
        populate: ['comp', 'dz'],
      });

      // verify that the returned document was updated
      expect(article).toMatchObject({
        title: 'Article',
        comp: {
          text: 'comp-1',
        },
        dz: [
          {
            __component: 'article.dz-comp',
            name: 'dz-comp-1',
          },
        ],
      });
    });

    testInTransaction('can create an article in dutch', async () => {
      const article = await strapi.documents(ARTICLE_UID).create({
        locale: 'nl',
        data: { title: 'Article' },
      });

      // verify that the returned document was updated
      expect(article).toMatchObject({
        title: 'Article',
        locale: 'nl', // selected locale
        publishedAt: null, // should be a draft
      });
    });

    testInTransaction.todo('can not directly create a published document');

    testInTransaction('publishedAt attribute is ignored when creating document', async () => {
      const article = await strapi.documents(ARTICLE_UID).create({
        data: { title: 'Article', publishedAt: new Date() },
      });

      // verify that the returned document was updated
      expect(article).toMatchObject({
        title: 'Article',
        publishedAt: null, // should be a draft
      });
    });

    testInTransaction('ignores locale parameter on non-localized content type', async () => {
      const author = await strapi.documents(AUTHOR_UID).create({
        // Should be ignored on non-localized content types
        locale: 'nl',
        data: { name: 'Author' },
      });

      // verify that the returned document was updated
      expect(author).toMatchObject({
        name: 'Author',
        locale: null, // should be null, as it is not a localized content type
      });
    });
  });
});
