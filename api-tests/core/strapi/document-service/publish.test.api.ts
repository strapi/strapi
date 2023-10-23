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

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  describe('Publish', () => {
    // will automatically publish the draft over the published version unless the draft wasn't modified
    // documents.publish('uid', documentId, {
    // support publishing one or many locales
    // support publishing relations at the same time or not
    /**
     *  locales: string[]
     *
     * strapi.documents.publish('uid', docId, { locales: ['en', 'fr']})
     *
     * What if you don't specify any locale?
     *  - Error? ❌
     *      - Super annoying if not using i18n
     *  - Publish all locales?
     *      - this is how all doc service methods work ✅

      // Happy path
      Scenario 1: Publishing a document with no locales
      Scenario 2: Publishing a single locale of a document with multiple locales
      Scenario 3: Publish multiple locales of a document
      Scenario 4: Publish all locales of a document

      // Edge cases
      Scenario 5: Publishing a document that does not exist should throw an error

      // FUTURE:
      Scenario 6: Publishing a document with multiple locales and relations
      - publish relations automatically
    */
    /**
     * open a transaction
     * try:
     *  find all versions of document(s) for the requested locales
     *  for each draft locale
     *    - if published version exists
     *      - delete published
     *    - clone draft as published [also clone the components]
     * catch:
     * - rollback
     * - re-throw the error
     * commit transaction
     */
    it.only(
      'publishes all locales when locale is not passed',
      testInTransaction(async () => {
        const locales = ['en', 'fr', 'it'];
        const originalDocsDb = await findArticlesDb({
          documentId: 'Article1',
          locale: { $in: locales },
        });

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

    it.skip(
      'publishes one locale of a document with multiple locales when locale is string',
      testInTransaction(async () => {
        const results = await strapi.documents.publish(ARTICLE_UID, 'Article1', {
          locales: ['en'],
        });
        expect(results).toBe({ count: 1 });
      })
    );

    it.skip(
      'publishes specified locales of a document with multiple locales when locale is array',
      testInTransaction(async () => {
        const results = await strapi.documents.publish(ARTICLE_UID, 'Article1', {
          locales: ['en', 'fr'],
        });
        expect(results).toBe({ count: 2 });
      })
    );

    it('publishes all locales of a document', async () => {});
  });
});
