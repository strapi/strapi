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

        const result = await strapi.documents(ARTICLE_UID).clone(articleDb.documentId, {
          locale: 'en', // should only clone the english locale
          data: {
            title: 'Cloned Document',
          },
        });

        expect(result).not.toBeNull();

        const clonedArticlesDb = await findArticlesDb({ documentId: result.documentId });

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
        const clonedArticlesDb = await findArticlesDb({ documentId: result.documentId });

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

    it('can not clone published documents', () => {
      const resultPromise = strapi.documents(ARTICLE_UID).clone('1234', {
        status: 'published',
      });

      expect(resultPromise).rejects.toThrowError('Cannot directly clone a published document');
    });

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
