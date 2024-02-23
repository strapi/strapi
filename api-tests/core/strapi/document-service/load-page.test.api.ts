import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import resources from './resources/index';
import { ARTICLE_UID, findArticlesDb } from './utils';

describe('Document Service', () => {
  let testUtils;

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  describe('loadPage', () => {
    it.skip('load pages of documents', async () => {
      const articlesDb = await findArticlesDb({});

      const documents = await strapi.documents.loadPages(
        ARTICLE_UID,
        articlesDb.map((document) => document.id),
        'relations'
      );

      expect(documents).toMatchObject({ results: testUtils.fixtures.relations });
    });
  });
});
