'use strict';

const { values } = require('lodash/fp');

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const resources = require('./resources');

const { fixtures, schemas } = resources;

const builder = createTestBuilder();

let strapi;
let rq;
let data;

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

  data = await builder.sanitizedFixtures(strapi);

  rq = await createAuthRequest({ strapi });
};

const validDocInput = {
  name: 'string attr',
};

describe('Core API - Validate', () => {
  beforeAll(async () => {
    await init();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test.todo('validate input data type');
  test.todo('validate restricted relations');

  describe.each([
    ['Create Input', 'post', () => '/api/documents'],
    ['Update Input', 'put', (doc) => `/api/documents/${doc.documentId}`],
  ])('%s', (description, method, urlFunc) => {
    let url;

    beforeAll(() => {
      url = urlFunc(data.document[0]);
    });

    describe('Valid cases', () => {
      const validAttributes = [
        ['name_private', 'private name'],
        ['password', 'mypasswordstring1234'],
        ['relations', [1]],
        ['private_relations', [1]],
        ['name_hidden', 'some hidden field'],
        ['name_private', 'some private field'],
        ['name_non_searchable', 'some non searchable field'],
      ];

      test.each(validAttributes)('%s', async (attribute, value) => {
        const res = await rq[method](url, {
          body: {
            data: {
              ...validDocInput,
              [attribute]: value,
            },
          },
        });
        expect(res.status).toBe(method === 'post' ? 201 : 200);
      });
    });

    describe('400 Bad Request cases', () => {
      it('empty body', async () => {
        const res = await rq[method](url, { body: {} });
        expect(res.status).toBe(400);
        expect(res.error.message).toMatch(new RegExp(`Cannot ${method.toUpperCase()}`, 'i'));
        const err = JSON.parse(res.text).error;
        expect(err.message).toMatch(/Missing "data"/i);
      });

      const invalidAttributes = [
        ['id', 132456],
        ['documentId', 'somedocid'],
        ['name_non_writable', 'non-writable field'],
        ['createdAt', new Date().toISOString()],
        ['updatedAt', new Date().toISOString()],
        ['nonexistant_field', 'i do not exist on the schema'],
      ];

      test.each(invalidAttributes)('%s', async (attribute, value) => {
        const res = await rq[method](url, {
          body: {
            data: {
              ...validDocInput,
              [attribute]: value,
            },
          },
        });
        expect(res.status).toBe(400);
        expect(res.error.message).toMatch(new RegExp(`Cannot ${method.toUpperCase()}`, 'i'));
        const err = JSON.parse(res.text).error;
        expect(err.message).toMatch(new RegExp(`invalid key ${attribute}`, 'i'));
        expect(err.details.key).toMatch(attribute);
        expect(err.details.source).toMatch('body');
      });
    });
  });
});
