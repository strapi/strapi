import './resources/types/components.d.ts';
import './resources/types/contentTypes.d.ts';
import resources from './resources';
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

  describe('Count', () => {
    it('counts documents', async () => {
      const articlesDb = await findArticlesDb({});

      const count = await strapi.documents.count(ARTICLE_UID);

      expect(count).toBe(articlesDb.length);
    });

    it.todo('counts documents with filters');
  });
});
