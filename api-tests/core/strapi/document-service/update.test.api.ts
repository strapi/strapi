import { LoadedStrapi } from '@strapi/types';
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
  let strapi: LoadedStrapi;

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
    strapi = testUtils.strapi;
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  describe('Update', () => {
    it(
      'update a document with defaults',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ title: 'Article1-Draft-EN' });
        const newName = 'Updated Document';

        const article = await strapi.documents(ARTICLE_UID).update(articleDb.documentId, {
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

    it(
      'update a document locale',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ title: 'Article1-Draft-FR' });
        const newName = 'updated document';

        // Update an existing locale of a document
        const article = await strapi.documents(ARTICLE_UID).update(articleDb.documentId, {
          locale: 'fr',
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
          id: articleDb.id,
          locale: 'fr',
          title: newName,
          updatedAt: article.updatedAt,
        });

        // verity others locales are not updated
        const enLocale = await findArticleDb({ title: 'Article1-Draft-EN' });
        expect(enLocale).toBeDefined();
      })
    );

    it(
      'create a new localization for an existing document',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ title: 'Article1-Draft-EN' });
        const newName = 'updated document';

        // Create a new article in spanish
        const article = await strapi.documents(ARTICLE_UID).update(articleDb.documentId, {
          locale: 'es',
          data: { title: newName, password: '123456' },
        });

        // verify that the returned document was updated
        expect(article).toMatchObject({
          documentId: articleDb.documentId,
          locale: 'es',
          title: newName,
          updatedAt: article.updatedAt,
        });

        // verify it was updated in the database
        const updatedArticleDb = await findArticleDb({ title: newName });
        expect(updatedArticleDb).toMatchObject(article);

        // verity others locales are not updated
        const enLocale = await findArticleDb({ title: 'Article1' });
        expect(enLocale).toBeDefined();
      })
    );

    it(
      'can not update published document',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ title: 'Article1-Draft-FR' });
        const newName = 'updated document';

        const updatePromise = strapi.documents(ARTICLE_UID).update(articleDb.documentId, {
          status: 'published',
          data: { title: newName },
        });

        await expect(updatePromise).rejects.toThrow(
          'Cannot update a published document. Use the publish method instead.'
        );
      })
    );

    it(
      'document to update does not exist',
      testInTransaction(async () => {
        const article = await strapi.documents(ARTICLE_UID).update('does-not-exist', {
          data: { title: 'updated document' },
        });

        expect(article).toBeNull();
      })
    );
  });
});
