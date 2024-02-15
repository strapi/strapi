import { LoadedStrapi } from '@strapi/types';
import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import { testInTransaction } from '../../../utils/index';
import resources from './resources/index';
import { ARTICLE_UID, findArticlesDb, AUTHOR_UID } from './utils';

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

        const articles = await findArticlesDb({ documentId: article.id });
        // Only one article should have been created
        expect(articles).toHaveLength(1);
      })
    );

    it(
      'can create document with components',
      testInTransaction(async () => {
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
      })
    );

    it(
      'can create an article in french',
      testInTransaction(async () => {
        const article = await strapi.documents(ARTICLE_UID).create({
          locale: 'fr',
          data: { title: 'Article' },
        });

        // verify that the returned document was updated
        expect(article).toMatchObject({
          title: 'Article',
          locale: 'fr', // selected locale
          publishedAt: null, // should be a draft
        });
      })
    );

    // TODO
    it.skip(
      'can not directly create a published document',
      testInTransaction(async () => {
        const articlePromise = strapi.documents(ARTICLE_UID).create({
          locale: 'fr',
          status: 'published',
          data: { title: 'Article' },
        });
      })
    );

    // TODO: Make publishedAt not editable
    it(
      'publishedAt attribute is ignored when creating document',
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

    it(
      'ignores locale parameter on non-localized content type',
      testInTransaction(async () => {
        const author = await strapi.documents(AUTHOR_UID).create({
          // Should be ignored on non-localized content types
          locale: 'fr',
          data: { name: 'Author' },
        });

        // verify that the returned document was updated
        expect(author).toMatchObject({
          name: 'Author',
          locale: null, // should be null, as it is not a localized content type
        });
      })
    );
  });
});
