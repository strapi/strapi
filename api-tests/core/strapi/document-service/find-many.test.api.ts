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

  describe('FindMany', () => {
    it('find many selects by document name', async () => {
      const articlesDb = await findArticlesDb({ name: '3 Document A' });

      const articles = await strapi.documents.findMany(ARTICLE_UID, {
        filters: {
          title: '3 Document A',
        },
      });

      expect(articles.length).toBe(1);
      expect(articles).toMatchObject(articlesDb);
    });
  });
});
