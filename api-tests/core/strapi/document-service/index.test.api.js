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
    const documentDb = await strapi
      .query('api::document.document')
      .findOne({ where: { name: { $eq: '3 Document A' } } });

    const document = await strapi.documentService.findOne(
      'api::document.document',
      documentDb.documentId
    );

    expect(document).toMatchObject(documentDb);
  });
});
