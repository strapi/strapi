import './resources/types/components.d.ts';
import './resources/types/contentTypes.d.ts';
import resources from './resources/index';
import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import { testInTransaction } from '../../../utils/index';
import '@strapi/types';

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

  describe('Update', () => {
    it(
      'update a document',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ title: '3 Document A' });
        const newName = 'Updated Document';

        const article = await strapi.documents.update(ARTICLE_UID, articleDb.documentId, {
          data: { title: newName },
        });

        // verify that the returned document was updated
        expect(article).toMatchObject({
          ...articleDb,
          title: newName,
          updatedAt: article.updatedAt,
        });

        // verify it was updated in the database
        const updatedArticleDb = await findArticleDb({ title: newName });
        expect(updatedArticleDb).toMatchObject({
          ...articleDb,
          title: newName,
          updatedAt: article.updatedAt,
        });
      })
    );
  });
});
