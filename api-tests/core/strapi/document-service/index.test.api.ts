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

import { values } from 'lodash/fp';

import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import resources from './resources';

const { fixtures, schemas } = resources;

const builder = createTestBuilder();

const DOCUMENT_UID = 'api::document.document' as Common.UID.ContentType;

let data: ReturnType<typeof builder.sanitizedFixtures>;
let strapi: LoadedStrapi;
let rq: ReturnType<typeof createAuthRequest>;

// Note: any tests that would cause writes to the db should be wrapped with this method to prevent changes
// Alternatively, we could truncate/insert the tables in afterEach which should be only marginally slower
const testInTransaction = (test) => {
  return async () => {
    await strapi.db.transaction(async ({ rollback }) => {
      await test();
      await rollback();
    });
  };
};

const addSchemas = () => {
  for (const component of values(schemas.components)) {
    builder.addComponent(component);
  }

  builder.addContentTypes(values(schemas['content-types']));
};

const addFixtures = () => {
  const creationOrder = ['api::relation.relation', 'api::document.document'];

  creationOrder.forEach((uid) => {
    const fixture = fixtures['content-types'][uid];
    const schema = schemas['content-types'][uid];

    builder.addFixtures(schema.singularName, fixture);
  });
};

const findDBDocument = async (where) => {
  const dbDocument = await strapi.query('api::document.document').findOne({ where });
  return dbDocument;
};

const findDBDocuments = async (where) => {
  const dbDocuments = await strapi.query('api::document.document').findMany({ where });
  return dbDocuments;
};

const init = async () => {
  addSchemas();
  addFixtures();

  await builder.build();

  strapi = (await createStrapiInstance()) as LoadedStrapi;
  rq = await createAuthRequest({ strapi });

  data = await builder.sanitizedFixtures(strapi);
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
      const documentDb = await findDBDocument({ name: '3 Document A' });

      const document = await strapi.documents.findOne(DOCUMENT_UID, documentDb.documentId, {
        locales: 'all',
      });

      expect(document).toMatchObject(documentDb);
    });
  });

  describe('FindMany', () => {
    it('find many selects by document name', async () => {
      const documentsDb = await findDBDocuments({ name: '3 Document A' });

      const documents = await strapi.documents.findMany(DOCUMENT_UID, {
        filters: {
          name: '3 Document A',
        },
      });

      expect(documents.length).toBe(1);
      expect(documents).toMatchObject(documentsDb);
    });
  });

  it(
    'update a document',
    testInTransaction(async () => {
      const documentDb = await findDBDocument({ name: '3 Document A' });
      const newName = 'Updated Document';

      const document = await strapi.documents.update(DOCUMENT_UID, documentDb.documentId, {
        data: { name: newName },
      });

      // verify that the returned document was updated
      expect(document).toMatchObject({
        ...documentDb,
        name: newName,
        updatedAt: document.updatedAt,
      });

      // verify it was updated in the database
      const updatedDocumentDb = await findDBDocument({ name: newName });
      expect(updatedDocumentDb).toMatchObject({
        ...documentDb,
        name: newName,
        updatedAt: document.updatedAt,
      });
    })
  );

  it(
    'delete a document by id',
    testInTransaction(async () => {
      const documentDb = await findDBDocument({ name: '3 Document A' });

      const document = await strapi.documents.delete(DOCUMENT_UID, documentDb.documentId);

      const deletedDocumentDb = await findDBDocument({ name: '3 Document A' });

      expect(deletedDocumentDb).toBeNull();
    })
  );

  it.todo('delete a document by name');

  it('counts documents', async () => {
    const documentsDb = await findDBDocuments({});

    const count = await strapi.documents.count('api::document.document');

    expect(count).toBe(documentsDb.length);
  });

  it.todo('counts documents with filters');

  it('find page of documents', async () => {
    const documentsDb = await findDBDocuments({});

    const documents = await strapi.documents.findPage(DOCUMENT_UID, {
      page: 1,
      pageSize: 10,
    });

    expect(documents).toMatchObject({
      results: documentsDb.slice(0, 10),
      pagination: {
        page: 1,
        pageSize: 10,
        pageCount: Math.ceil(documentsDb.length / 10),
        total: documentsDb.length,
      },
    });
  });

  it(
    'clone a document',
    testInTransaction(async () => {
      const documentDb = await findDBDocument({ name: '3 Document A' });

      const document = await strapi.documents.clone(DOCUMENT_UID, documentDb.documentId, {
        data: {
          name: 'Cloned Document',
        },
      });

      const clonedDocumentDb = await findDBDocument({ name: 'Cloned Document' });

      expect(clonedDocumentDb).toBeDefined();
      expect(clonedDocumentDb).toMatchObject({ name: 'Cloned Document' });
    })
  );

  it('load a document', async () => {
    const documentDb = await findDBDocument({ name: '3 Document A' });

    const relations = await strapi.documents.load(DOCUMENT_UID, documentDb.documentId, 'relations');

    expect(relations).toMatchObject(fixtures.relations);
  });

  it('load pages of documents', async () => {
    const documentsDb = await findDBDocuments({});

    const documents = await strapi.documents.loadPages(
      DOCUMENT_UID,
      documentsDb.map((document) => document.documentId),
      'relations'
    );

    expect(documents).toMatchObject({ results: fixtures.relations });
  });

  it(
    'delete many documents with where clause',
    testInTransaction(async () => {
      const documentsDb = await findDBDocuments({});
      const count = await strapi.documents.deleteMany(DOCUMENT_UID, {
        where: { documentId: { $in: documentsDb.map((document) => document.documentId) } },
      });

      const countDb = await findDBDocuments({});
      expect(countDb).toBe(0);
      expect(count).toHaveLength(0);
    })
  );

  it(
    'delete many documents with array of ids',
    testInTransaction(async () => {
      const documentsDb = await findDBDocuments({});

      const count = await strapi.documents.deleteMany(
        DOCUMENT_UID,
        documentsDb.map((document) => document.documentId)
      );

      const countDb = await findDBDocuments({});
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
        const locales = ['en', 'es', 'fr'];
        const originalDocsDb = await findDBDocuments({ locale: { $in: locales } });

        const results = await strapi.documents.publish(DOCUMENT_UID, 'doc-en-fr-es');
        expect(results).toBe({ count: 3 });

        const updatedDocsDb = await findDBDocuments({ locale: { $in: locales } });

        // this is wrong, thinking about the right way
        // expect 3 draft and 3 publish
        expect(updatedDocsDb.length).toBe(6);
        locales.forEach((locale) => {
          const published = updatedDocsDb.find(
            (doc) => doc.status === 'published' && doc.locale === locale
          );
          // expect published from db to match original from
          const draft = updatedDocsDb.find(
            (doc) => doc.status === 'draft' && doc.locale === locale
          );
        });
      })
    );

    it.skip(
      'publishes one locale of a document with multiple locales when locale is string',
      testInTransaction(async () => {
        const results = await strapi.documents.publish(DOCUMENT_UID, 'doc-en-fr-es', {
          locales: 'en',
        });
        expect(results).toBe({ count: 1 });
      })
    );
    it.skip(
      'publishes specified locales of a document with multiple locales when locale is array',
      testInTransaction(async () => {
        const results = await strapi.documents.publish(DOCUMENT_UID, 'doc-en-fr-es', {
          locales: ['en', 'fr'],
        });
        expect(results).toBe({ count: 2 });
      })
    );
    it('publishes all locales of a document', async () => {});
  });
});
