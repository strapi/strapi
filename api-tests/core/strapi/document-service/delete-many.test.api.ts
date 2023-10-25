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

  describe('deleteMany', () => {
    it(
      'delete many documents with where clause',
      testInTransaction(async () => {
        const articlesDb = await findArticlesDb({});
        const count = await strapi.documents.deleteMany(ARTICLE_UID, {
          filters: { documentId: { $in: articlesDb.map((document) => document.documentId) } },
        });

        const countDb = await findArticlesDb({});
        expect(countDb).toBe(0);
        expect(count).toHaveLength(0);
      })
    );

    it(
      'delete many documents with array of ids',
      testInTransaction(async () => {
        const articlesDb = await findArticlesDb({});

        const count = await strapi.documents.deleteMany(
          ARTICLE_UID,
          articlesDb.map((document) => document.documentId)
        );

        const countDb = await findArticlesDb({});
        expect(countDb).toBe(0);
        expect(count).toHaveLength(0);
      })
    );
  });
});
