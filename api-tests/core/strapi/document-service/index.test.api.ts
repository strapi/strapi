/**
 * TODO:
 *  - import types for content types
 * - Components
 * - split this test into one test for each docservice method
 *
 * METHODS.
 * Find Many - Ben
 * Find One - Ben
 * Find First - Ben
 * Create - Ben
 * Update - Marc
 * Delete - Marc
 * Count - Marc
 * FindPage - Marc
 * Clone - Ben
 * Load
 * LoadPages
 * DeleteMany
 *
 */

import type { Common, LoadedStrapi } from '@strapi/types';
import './resources/types/components.d.ts';
import './resources/types/contentTypes.d.ts';

import { values } from 'lodash/fp';

import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import resources from './resources';

const { fixtures, schemas } = resources;

const builder = createTestBuilder();

const ARTICLE_UID = 'api::article.article';
const CATEGORY_UID = 'api::category.category';

let data: ReturnType<typeof builder.sanitizedFixtures>;
let strapi: LoadedStrapi;
let rq: ReturnType<typeof createAuthRequest>;

// Note: any tests that would cause writes to the db should be wrapped with this method to prevent changes
// Alternatively, we could truncate/insert the tables in afterEach which should be only marginally slower
// TODO: move to utils
const testInTransaction = (test) => {
  return async () => {
    await strapi.db.transaction(async ({ rollback }) => {
      await test();
      await rollback();
    });
  };
};

// TODO: move to utils
const addSchemas = () => {
  for (const component of values(schemas.components)) {
    builder.addComponent(component);
  }

  builder.addContentTypes(values(schemas['content-types']));
};

// TODO: move to utils
const addFixtures = () => {
  // Add locales
  builder.addFixtures('plugin::i18n.locale', [
    { name: 'fr', code: 'fr' },
    { name: 'it', code: 'it' },
  ]);

  const creationOrder = [CATEGORY_UID, ARTICLE_UID];
  creationOrder.forEach((uid) => {
    const fixture = fixtures['content-types'][uid];
    const schema = schemas['content-types'][uid];

    builder.addFixtures(schema.singularName, fixture);
  });
};

// TODO: move to utils
const init = async () => {
  addSchemas();
  addFixtures();

  await builder.build();

  strapi = (await createStrapiInstance()) as LoadedStrapi;
  rq = await createAuthRequest({ strapi });

  data = await builder.sanitizedFixtures(strapi);
};

const findArticleDb = async (where: any) => {
  // TODO: FindOneParams type
  return await strapi.query(ARTICLE_UID).findOne({ where });
};

const findArticlesDb = async (where: any) => {
  // TODO: Params type
  return await strapi.query(ARTICLE_UID).findMany({ where });
};

describe('Document Service', () => {
  beforeAll(async () => {
    await init();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('FindOne', () => {
    it('find one selects by document id', async () => {
      const articleDb = await findArticleDb({ name: '3 Document A' });

      const article = await strapi.documents.findOne(ARTICLE_UID, articleDb.documentId, {
        // locales: 'all',
      });

      expect(article).toMatchObject(articleDb);
    });
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

  describe('Update', () => {
    it(
      'update a document',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ name: '3 Document A' });
        const newName = 'Updated Document';

        const article = await strapi.documents.update(ARTICLE_UID, articleDb.documentId, {
          data: { title: newName },
        });

        // verify that the returned document was updated
        expect(article).toMatchObject({
          ...articleDb,
          name: newName,
          updatedAt: article.updatedAt,
        });

        // verify it was updated in the database
        const updatedArticleDb = await findArticleDb({ name: newName });
        expect(updatedArticleDb).toMatchObject({
          ...articleDb,
          name: newName,
          updatedAt: article.updatedAt,
        });
      })
    );
  });

  describe('Delete', () => {
    it(
      'delete a document by id',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ name: '3 Document A' });

        const article = await strapi.documents.delete(ARTICLE_UID, articleDb.documentId);

        const deletedArticleDb = await findArticleDb({ name: '3 Document A' });

        expect(deletedArticleDb).toBeNull();
      })
    );

    it.todo('delete a document by name');
  });

  describe('Count', () => {
    it('counts documents', async () => {
      const articlesDb = await findArticlesDb({});

      const count = await strapi.documents.count(ARTICLE_UID);

      expect(count).toBe(articlesDb.length);
    });

    it.todo('counts documents with filters');
  });

  it(
    'clone a document',
    testInTransaction(async () => {
      const articleDb = await findArticleDb({ name: '3 Document A' });

      const article = await strapi.documents.clone(ARTICLE_UID, articleDb.documentId, {
        data: {
          title: 'Cloned Document',
        },
      });

      const clonedArticleDb = await findArticleDb({ name: 'Cloned Document' });

      expect(clonedArticleDb).toBeDefined();
      expect(clonedArticleDb).toMatchObject({ name: 'Cloned Document' });
    })
  );

  it('load a document', async () => {
    const articleDb = await findArticleDb({ name: '3 Document A' });

    // @ts-expect-error - Implement load
    const relations = await strapi.documents.load(ARTICLE_UID, articleDb.documentId, 'relations');

    expect(relations).toMatchObject(fixtures.relations);
  });

  it('load pages of documents', async () => {
    const articlesDb = await findArticlesDb({});

    // @ts-expect-error - Implement load pages
    const documents = await strapi.documents.loadPages(
      ARTICLE_UID,
      articlesDb.map((document) => document.documentId),
      'relations'
    );

    expect(documents).toMatchObject({ results: fixtures.relations });
  });

  it(
    'delete many documents with where clause',
    testInTransaction(async () => {
      const articlesDb = await findArticlesDb({});
      const count = await strapi.documents.deleteMany(ARTICLE_UID, {
        // @ts-expect-error - add document id into generated TS types
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

  describe('Publish', () => {
    // will automatically publish the draft over the published version unless the draft wasn't modified
    // documents.publish('uid', documentId, {
    // support publishing one or many locales
    // support publishing relations at the same time or not
    /**
     *  locales: string[]
     *
     * strapi.documents.publish('uid', docId, { locales: ['en', 'fr']})
     *
     * What if you don't specify any locale?
     *  - Error? ❌
     *      - Super annoying if not using i18n
     *  - Publish all locales?
     *      - this is how all doc service methods work ✅

      // Happy path
      Scenario 1: Publishing a document with no locales
      Scenario 2: Publishing a single locale of a document with multiple locales
      Scenario 3: Publish multiple locales of a document
      Scenario 4: Publish all locales of a document

      // Edge cases
      Scenario 5: Publishing a document that does not exist should throw an error

      // FUTURE:
      Scenario 6: Publishing a document with multiple locales and relations
      - publish relations automatically
    */
    /**
     * open a transaction
     * try:
     *  find all versions of document(s) for the requested locales
     *  for each draft locale
     *    - if published version exists
     *      - delete published
     *    - clone draft as published [also clone the components]
     * catch:
     * - rollback
     * - re-throw the error
     * commit transaction
     */
    it.only(
      'publishes all locales when locale is not passed',
      testInTransaction(async () => {
        const locales = ['en', 'fr', 'it'];
        const originalDocsDb = await findArticlesDb({
          documentId: 'Article1',
          locale: { $in: locales },
        });

        const results = await strapi.documents.publish(ARTICLE_UID, originalDocsDb[0].documentId);
        // expect(results).toBe({ count: 3 });
        // Fix this
        expect(results).toBe(3);

        const updatedArticlesDb = await findArticlesDb({
          documentId: 'Article1',
          locale: { $in: locales },
        });

        // this is wrong, thinking about the right way
        // expect 3 draft and 3 publish
        expect(updatedArticlesDb.length).toBe(6);
        locales.forEach((locale) => {
          const published = updatedArticlesDb.find(
            (doc) => doc.status === 'published' && doc.locale === locale
          );
          // expect published from db to match original from
          const draft = updatedArticlesDb.find(
            (doc) => doc.status === 'draft' && doc.locale === locale
          );
        });
      })
    );

    it.skip(
      'publishes one locale of a document with multiple locales when locale is string',
      testInTransaction(async () => {
        const results = await strapi.documents.publish(ARTICLE_UID, 'Article1', {
          locales: ['en'],
        });
        expect(results).toBe({ count: 1 });
      })
    );

    it.skip(
      'publishes specified locales of a document with multiple locales when locale is array',
      testInTransaction(async () => {
        const results = await strapi.documents.publish(ARTICLE_UID, 'Article1', {
          locales: ['en', 'fr'],
        });
        expect(results).toBe({ count: 2 });
      })
    );

    it('publishes all locales of a document', async () => {});
  });
});
