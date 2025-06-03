import type { Core } from '@strapi/types';

import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import { testInTransaction } from '../../../utils';
import resources from './resources/index';
import { ARTICLE_UID, findArticleDb, findArticlesDb } from './utils';

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

  describe('clone', () => {
    testInTransaction('clone a document locale', async () => {
      const articleDb = await findArticleDb({ title: 'Article1-Draft-EN' });

      const result = await strapi.documents(ARTICLE_UID).clone({
        documentId: articleDb.documentId,
        locale: 'en', // should only clone the english locale
        data: { title: 'Cloned Document' },
      });

      expect(result).not.toBeNull();

      const clonedArticlesDb = await findArticlesDb({ documentId: result.documentId });

      // all articles should be in draft, and only one should be english
      expect(clonedArticlesDb.length).toBe(1);
      expect(clonedArticlesDb[0]).toMatchObject({
        // FIXME: this should be the same as the original article
        // password: articleDb.password,
        private: articleDb.private,
        title: 'Cloned Document',
        locale: 'en',
        publishedAt: null,
      });

      // Original article should not be modified
      const originalArticleDb = await findArticleDb({ documentId: articleDb.documentId });
      expect(originalArticleDb).toMatchObject(articleDb);
    });

    testInTransaction('clone all document locales ', async () => {
      const articleDb = await findArticleDb({ title: 'Article1-Draft-EN' });

      const result = await strapi.documents(ARTICLE_UID).clone({
        documentId: articleDb.documentId,
        data: {
          title: 'Cloned Document', // Clone all locales
        },
        locale: '*',
      });

      expect(result).not.toBeNull();

      const originalArticlesDb = await findArticlesDb({
        documentId: articleDb.documentId,
        publishedAt: null,
      });
      const clonedArticlesDb = await findArticlesDb({ documentId: result.documentId });

      // all articles should be in draft, and all locales should be cloned
      expect(clonedArticlesDb.length).toBe(originalArticlesDb.length);
      clonedArticlesDb.forEach((article) => {
        expect(article).toMatchObject({
          title: 'Cloned Document',
          publishedAt: null,
        });
      });
    });

    testInTransaction('clone a document with components', async () => {
      const articlesDb = await findArticlesDb({ documentId: 'Article1' });
      const documentId = articlesDb.at(0)!.documentId;

      const componentData = {
        comp: {
          text: 'comp-1',
        },
        dz: [
          {
            __component: 'article.dz-comp',
            name: 'dz-comp-1',
          },
        ],
      } as const;

      // update article
      const clonedArticle = await strapi.documents(ARTICLE_UID).clone({
        documentId,
        locale: 'en',
        data: {
          comp: componentData.comp,
          dz: [...componentData.dz],
        },
        populate: ['comp', 'dz'],
      });

      // Cloned articles should have the components
      expect(clonedArticle.entries.length).toBe(1);
      expect(clonedArticle.entries[0]).toMatchObject({
        ...componentData,
        publishedAt: null,
      });
    });

    testInTransaction.todo('clone a document with media');
    testInTransaction.todo('clone a document with relations');

    testInTransaction('clone non existing document', async () => {
      const resultPromise = await strapi.documents(ARTICLE_UID).clone({
        documentId: '1234',
        data: {
          title: 'Cloned Document',
        },
      });

      expect(resultPromise).toMatchObject({
        documentId: undefined,
        entries: [],
      });
    });
  });
});
