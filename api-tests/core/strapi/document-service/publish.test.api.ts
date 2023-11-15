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

  describe('Publish', () => {
    it(
      'publishes all locales when locale is not passed',
      testInTransaction(async () => {
        const locales = ['en', 'fr', 'it'];
        const originalDocsDb = await findArticlesDb({
          documentId: 'Article1',
          locale: { $in: locales },
        });

        // Publish all locales
        const results = await strapi.documents.publish(ARTICLE_UID, originalDocsDb[0].documentId);

        // expect(results).toBe({ count: 3 });
        // Fix this
        expect(results).toBe(3);

        const updatedArticlesDb = await findArticlesDb({
          documentId: 'Article1',
          locale: { $in: locales },
        });

        // this is wrong, thinking about the right way
        // expect 3 draft and 3 publish
        expect(updatedArticlesDb.length).toBe(6);
        locales.forEach((locale) => {
          const published = updatedArticlesDb.find(
            (doc) => doc.status === 'published' && doc.locale === locale
          );
          // expect published from db to match original from
          const draft = updatedArticlesDb.find(
            (doc) => doc.status === 'draft' && doc.locale === locale
          );
        });
      })
    );

    it(
      'publishes one locale of a document with multiple locales when locale is string',
      testInTransaction(async () => {
        const results = await strapi.documents.publish(ARTICLE_UID, 'Article1', {
          locales: ['en'], // Publish only english
        });
        expect(results).toBe({ count: 1 });
      })
    );

    it(
      'publishes specified locales of a document with multiple locales when locale is array',
      testInTransaction(async () => {
        const results = await strapi.documents.publish(ARTICLE_UID, 'Article1', {
          locales: ['en', 'fr'], // Publish only english and french
        });
        expect(results).toBe({ count: 2 });
      })
    );

    it('publishes all locales of a document', async () => {});
  });
});
