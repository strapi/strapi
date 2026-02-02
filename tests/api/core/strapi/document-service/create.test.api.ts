import type { Core, Modules } from '@strapi/types';

import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import { testInTransaction } from '../../../utils/index';
import resources from './resources/index';
import { ARTICLE_UID, findArticlesDb, AUTHOR_UID } from './utils';

let strapi: Core.Strapi;

const createArticle = async (params: Modules.Documents.ServiceParams['create']) => {
  return strapi.documents(ARTICLE_UID).create({ populate: '*', ...params });
};

const createAuthor = async (params: Modules.Documents.ServiceParams['create']) => {
  return strapi.documents(AUTHOR_UID).create(params);
};

describe('Document Service', () => {
  let testUtils;

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
    strapi = testUtils.strapi;
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  describe('Create', () => {
    testInTransaction('Can create a draft document', async () => {
      const data = {
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
      };

      const article = await createArticle({ data });

      // verify that the returned document was updated
      expect(article).toMatchObject({
        ...data,
        locale: 'en', // default locale
        publishedAt: null, // should be a draft
      });

      const articles = await findArticlesDb({ documentId: article.documentId });
      // Only one article should have been created
      expect(articles).toHaveLength(1);
    });

    testInTransaction('Can create an article in dutch', async () => {
      const article = await createArticle({
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

    testInTransaction('Can draft and publish', async () => {
      const article = await createArticle({
        data: { title: 'Article' },
        status: 'published',
      });

      expect(article).toMatchObject({
        title: 'Article',
        publishedAt: expect.any(String),
      });
    });

    testInTransaction('publishedAt attribute is ignored when creating document', async () => {
      const article = await createArticle({
        data: { title: 'Article', publishedAt: new Date() },
      });

      expect(article).toMatchObject({
        title: 'Article',
        publishedAt: null, // should be a draft
      });
    });

    testInTransaction('ignores locale parameter on non-localized content type', async () => {
      const author = await createAuthor({
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
