import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import resources from './resources';
import { ARTICLE_UID, findArticlesDb } from './utils';

describe('Document Service', () => {
  let testUtils;

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  describe('Count', () => {
    it('counts documents', async () => {
      const articlesDb = await findArticlesDb({});

      const count = await strapi.documents.count(ARTICLE_UID);

      expect(count).toBe(articlesDb.length);
    });

    it.todo('counts documents with filters');
  });
});
