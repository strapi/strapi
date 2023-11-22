import { LoadedStrapi } from '@strapi/types';
import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import { testInTransaction } from '../../../utils/index';
import resources from './resources/index';
import { ARTICLE_UID, findArticleDb, findArticlesDb } from './utils';

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

  describe('clone', () => {
    it(
      'clone a document locale',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ title: 'Article1-Draft-EN' });

        const result = await strapi.documents(ARTICLE_UID).clone(articleDb.documentId, {
          locale: 'en', // should only clone the english locale
          data: {
            title: 'Cloned Document',
          },
        });

        expect(result).not.toBeNull();

        const clonedArticlesDb = await findArticlesDb({ documentId: result.id });

        // all articles should be in draft, and only one should be english
        expect(clonedArticlesDb.length).toBe(1);
        expect(clonedArticlesDb[0]).toMatchObject({
          password: articleDb.password,
          title: 'Cloned Document',
          locale: 'en',
          publishedAt: null,
        });

        // Original article should not be modified
        const originalArticleDb = await findArticleDb({ documentId: articleDb.documentId });
        expect(originalArticleDb).toMatchObject(articleDb);
      })
    );

    it(
      'clone all document locales ',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ title: 'Article1-Draft-EN' });

        const result = await strapi.documents(ARTICLE_UID).clone(articleDb.documentId, {
          data: {
            title: 'Cloned Document', // Clone all locales
          },
        });

        expect(result).not.toBeNull();

        const originalArticlesDb = await findArticlesDb({
          documentId: articleDb.documentId,
          publishedAt: null,
        });
        const clonedArticlesDb = await findArticlesDb({ documentId: result.id });

        // all articles should be in draft, and all locales should be cloned
        expect(clonedArticlesDb.length).toBe(originalArticlesDb.length);
        clonedArticlesDb.forEach((article) => {
          expect(article).toMatchObject({
            title: 'Cloned Document',
            publishedAt: null,
          });
        });
      })
    );

    it('clone non existing document', () => {
      const resultPromise = strapi.documents(ARTICLE_UID).clone('1234', {
        data: {
          title: 'Cloned Document',
        },
      });

      expect(resultPromise).resolves.toBeNull();
    });
    // TODO: Validate cloning components, media, relations, etc.
  });
});
