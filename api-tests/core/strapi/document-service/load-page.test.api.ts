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

  describe('loadPage', () => {
    it('load pages of documents', async () => {
      const articlesDb = await findArticlesDb({});

      const documents = await strapi.documents.loadPages(
        ARTICLE_UID,
        articlesDb.map((document) => document.documentId),
        'relations'
      );

      expect(documents).toMatchObject({ results: testUtils.fixtures.relations });
    });
  });
});
