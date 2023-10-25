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

  describe('FindPage', () => {
    it('find page of documents', async () => {
      const articlesDb = await findArticlesDb({});

      const articles = await strapi.documents.findPage(ARTICLE_UID, {
        page: 1,
        pageSize: 10,
      });

      expect(articles).toMatchObject({
        results: articlesDb.slice(0, 10),
        pagination: {
          page: 1,
          pageSize: 10,
          pageCount: Math.ceil(articlesDb.length / 10),
          total: articlesDb.length,
        },
      });
    });
  });
});
