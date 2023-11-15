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

  describe('clone', () => {
    it(
      'clone a document locale',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ title: 'Article1-Draft-EN' });

        const article = await strapi.documents(ARTICLE_UID).clone(articleDb.documentId, {
          data: {
            title: 'Cloned Document',
            locale: 'en', // should only clone the english locale
          },
        });

        const clonedArticlesDb = await findArticlesDb({ id: article.documentId });

        // all articles should be in draft, and only one should be english
        expect(clonedArticlesDb.length).toBe(1);
        expect(clonedArticlesDb[0]).toMatchObject({
          ...articleDb,
          title: 'Cloned Document',
          locale: 'en',
          publishedAt: null,
        });
      })
    );

    it.todo(
      'clone all document locales ',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ title: 'Article1-Draft-EN' });

        // .clone() should only return the doc id
        // { id: Document.ID }
        const article = await strapi.documents(ARTICLE_UID).clone(articleDb.documentId, {
          data: {
            title: 'Cloned Document', // Clone all locales
          },
        });

        const clonedArticlesDb = await findArticlesDb({ id: article.documentId });

        // all articles should be in draft
        expect(clonedArticlesDb.length).toBeGreaterThan(1);
        clonedArticlesDb.forEach((article) => {
          expect(article).toMatchObject({
            ...articleDb,
            title: 'Cloned Document',
            publishedAt: null,
          });
        });
      })
    );
  });
});
