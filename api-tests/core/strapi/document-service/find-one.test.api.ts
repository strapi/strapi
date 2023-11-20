import { LoadedStrapi } from '@strapi/types';
import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import { testInTransaction } from '../../../utils/index';
import resources from './resources/index';
import { ARTICLE_UID, findArticleDb } from './utils';

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

  describe('FindOne', () => {
    it(
      'find one document returns defaults',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ title: 'Article1-Draft-EN' });

        const article = await strapi.documents(ARTICLE_UID).findOne(articleDb.documentId, {});

        expect(article).toMatchObject(articleDb);
      })
    );

    it(
      'find one document in english',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ title: 'Article1-Draft-EN' });

        const article = await strapi.documents(ARTICLE_UID).findOne(articleDb.documentId, {
          locale: 'en',
        });

        expect(article).toMatchObject(articleDb);
      })
    );

    it(
      'find one published document',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ title: 'Article2-Published-EN' });

        const article = await strapi.documents(ARTICLE_UID).findOne(articleDb.documentId, {
          status: 'published',
        });

        expect(article).toMatchObject(articleDb);
      })
    );

    it(
      'find one draft document',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ title: 'Article1-Draft-EN' });

        const article = await strapi.documents(ARTICLE_UID).findOne(articleDb.documentId, {
          status: 'draft',
        });

        expect(article).toMatchObject(articleDb);
      })
    );
  });
});
