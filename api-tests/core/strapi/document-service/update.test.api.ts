import { LoadedStrapi } from '@strapi/types';
import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import { testInTransaction } from '../../../utils/index';
import resources from './resources/index';
import { ARTICLE_UID, findArticleDb, switchIdForDocumentId } from './utils';

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

        const article = await strapi.documents(ARTICLE_UID).update(articleDb.id, {
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
      'update document component',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ title: 'Article1-Draft-EN' });
        const dataToUpdate = {
          comp: {
            text: 'comp-1',
          },
          dz: [
            {
              __component: 'article.dz-comp',
              name: 'dz-comp-1',
            },
          ],
        } as const;

        const article = await strapi.documents(ARTICLE_UID).update(articleDb.id, {
          data: {
            comp: dataToUpdate.comp,
            dz: [...dataToUpdate.dz],
          },
          populate: ['comp', 'dz'],
        });

        // verify that the returned document was updated
        expect(article).toMatchObject({
          ...articleDb,
          ...dataToUpdate,
          updatedAt: article.updatedAt,
        });
      })
    );

    it(
      'update a document locale',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ title: 'Article1-Draft-NL' });
        const newName = 'updated document';

        // Update an existing locale of a document
        const article = await strapi.documents(ARTICLE_UID).update(articleDb.id, {
          locale: 'nl',
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
          locale: 'nl',
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
        const article = await strapi.documents(ARTICLE_UID).update(articleDb.id, {
          locale: 'es',
          data: { title: newName, password: '123456' },
        });

        // verify that the returned document was updated
        expect(article).toMatchObject({
          id: articleDb.id,
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

    // TODO
    it.skip(
      'can not update published document',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ title: 'Article1-Draft-FR' });
        const newName = 'updated document';

        const updatePromise = strapi.documents(ARTICLE_UID).update(articleDb.id, {
          status: 'published',
          data: { title: newName },
        });
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
