/**
 * METHODS.
 * Find Many - Ben
 * Find One - Ben
 * Find First - Ben
 * Create - Ben
 * Update - Marc
 * Delete - Marc
 *
 * // To do:
 *    Count - Marc
 *    FindPage - Marc
 *    Clone
 *    Load
 *    LoadPages
 *    DeleteMany
 *
 * - Components
 */

// Fixtures
// Schemas
// Initialize strapi

const { values, zip, symmetricDifference } = require('lodash/fp');

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const resources = require('./resources');

const { fixtures, schemas } = resources;

const builder = createTestBuilder();

let data;
let strapi;
let rq;

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
  const dbDocuments = await strapi.query('api::document.document').find({ where });
  return dbDocuments;
};

const init = async () => {
  addSchemas();
  addFixtures();

  await builder.build();

  strapi = await createStrapiInstance();
  rq = await createAuthRequest({ strapi });

  data = await builder.sanitizedFixtures(strapi);
};

describe('Document Service - Find One', () => {
  beforeEach(async () => {
    await init();
  });

  afterEach(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  it('find one selects by document id', async () => {
    const documentDb = await findDBDocument({ name: '3 Document A' });

    const document = await strapi.documentService.findOne(
      'api::document.document',
      documentDb.documentId
    );

    expect(document).toMatchObject(documentDb);
  });

  it('update a document', async () => {
    const documentDb = await findDBDocument({ name: '3 Document A' });

    const document = await strapi.documentService.update(
      'api::document.document',
      documentDb.documentId,
      {
        data: { name: 'Updated Document' },
      }
    );

    expect(document).toMatchObject({ name: 'Updated Document' });
  });

  it('delete a document', async () => {
    const documentDb = await findDBDocument({ name: '3 Document A' });

    const document = await strapi.documentService.delete(
      'api::document.document',
      documentDb.documentId
    );

    const deletedDocumentDb = await findDBDocument({ name: '3 Document A' });

    expect(deletedDocumentDb).toBeNull();
  });

  it.skip('count documents', async () => {
    const documentsDb = await findDBDocuments({});

    const count = await strapi.documentService.count('api::document.document');

    expect(count).toBe(documentsDb.length);
  });

  it.skip('find page of documents', async () => {
    const documentsDb = await findDBDocuments({});

    const documents = await strapi.documentService.findPage('api::document.document', {
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

  it.skip('clone a document', async () => {
    const documentDb = await findDBDocument({ name: '3 Document A' });

    const document = await strapi.documentService.clone(
      'api::document.document',
      documentDb.documentId,
      {
        data: {
          name: 'Cloned Document',
        },
      }
    );

    const clonedDocumentDb = await findDBDocument({ name: 'Cloned Document' });

    expect(clonedDocumentDb).toBeDefined();
    expect(clonedDocumentDb).toMatchObject({ name: 'Cloned Document' });
  });

  it.skip('load a document', async () => {
    const documentDb = await findDBDocument({ name: '3 Document A' });

    const relations = await strapi.documentService.load(
      'api::document.document',
      documentDb.documentId,
      'relations'
    );

    expect(relations).toMatchObject(fixtures.relations);
  });

  it.skip('load pages of documents', async () => {
    const documentsDb = await findDBDocuments({});

    const documents = await strapi.documentService.loadPages(
      'api::document.document',
      documentsDb.map((document) => document.documentId),
      'relations'
    );

    expect(documents).toMatchObject({ results: fixtures.relations });
  });

  it.skip('delete many documents', async () => {
    const documentsDb = await findDBDocuments({});

    const documents = await strapi.documentService.deleteMany(
      'api::document.document',
      documentsDb.map((document) => document.documentId)
    );

    const deletedDocumentsDb = await findDBDocuments({});

    expect(deletedDocumentsDb).toHaveLength(0);
  });
});
