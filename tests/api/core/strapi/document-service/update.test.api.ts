import type { Core, Modules } from '@strapi/types';

import { omit } from 'lodash/fp';

import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import { testInTransaction } from '../../../utils/index';
import resources from './resources/index';
import { ARTICLE_UID, findArticleDb } from './utils';

let strapi: Core.Strapi;

const updateArticle = async (params: Modules.Documents.ServiceParams['update']) => {
  return strapi.documents(ARTICLE_UID).update({ ...params });
};

describe('Document Service', () => {
  let testUtils;

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
    strapi = testUtils.strapi;
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  describe('Update', () => {
    testInTransaction('Can update a draft', async () => {
      const articleDb = await findArticleDb({ title: 'Article1-Draft-EN' });

      const data = {
        title: 'Updated Document',
        comp: {
          text: 'comp-1',
        },
        dz: [
          {
            __component: 'article.dz-comp',
            name: 'dz-comp-1',
          },
        ],
      };

      const article = await updateArticle({
        documentId: articleDb.documentId,
        data,
        populate: '*',
      });

      // verify that the returned document was updated
      expect(article).toMatchObject({
        ...omit('updatedAt', articleDb),
        ...data,
      });
    });

    testInTransaction('Can update a draft article in dutch', async () => {
      const articleDb = await findArticleDb({ title: 'Article1-Draft-NL' });

      const data = { title: 'updated document' };

      // Update an existing locale of a document
      const article = await updateArticle({
        documentId: articleDb.documentId,
        locale: 'nl',
        data,
      });

      // verify that the returned document was updated
      expect(article).toMatchObject({
        ...omit('updatedAt', articleDb),
        ...data,
      });

      // verity others locales are not updated
      const enLocale = await findArticleDb({ title: 'Article1-Draft-EN' });
      expect(enLocale).toBeDefined();
    });

    testInTransaction('Create a new locale for an existing document', async () => {
      const articleDb = await findArticleDb({ title: 'Article1-Draft-EN' });
      const newName = 'updated document';

      // Create a new article in spanish
      const data = { title: newName };
      const article = await updateArticle({
        documentId: articleDb.documentId,
        locale: 'es',
        data,
      });

      // verify that the returned document was updated
      expect(article).toMatchObject({
        documentId: articleDb.documentId,
        locale: 'es',
        ...data,
      });

      // verify it was updated in the database
      const updatedArticleDb = await findArticleDb({ title: newName });
      expect(updatedArticleDb).toMatchObject(article);

      // verity others locales are not updated
      const enLocale = await findArticleDb({ title: 'Article1' });
      expect(enLocale).toBeDefined();
    });

    testInTransaction('Can update a draft and publish it', async () => {
      const articleDb = await findArticleDb({ title: 'Article1-Draft-EN' });

      const article = await updateArticle({
        documentId: articleDb.documentId,
        data: { title: 'Updated Document' },
        status: 'published',
      });

      expect(article).toMatchObject({
        title: 'Updated Document',
        publishedAt: expect.any(String),
      });
    });

    testInTransaction('Returns null if document to update does not exist', async () => {
      const article = await updateArticle({
        documentId: 'does-not-exist',
        data: { title: 'updated document' },
      });

      expect(article).toBeNull();
    });
  });
});
