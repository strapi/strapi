import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import resources from './resources/index';
import { ARTICLE_UID, findArticleDb } from './utils';

describe('Document Service', () => {
  let testUtils;

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  describe('load', () => {
    it.skip('load a document', async () => {
      const articleDb = await findArticleDb({ name: '3 Document A' });

      const relations = await strapi.documents.load(ARTICLE_UID, articleDb.documentId, 'relations');

      expect(relations).toMatchObject(testUtils.fixtures.relations);
    });
  });
});
