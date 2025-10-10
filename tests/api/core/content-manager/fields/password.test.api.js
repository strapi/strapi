'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;

const ct = {
  displayName: 'withpassword',
  singularName: 'withpassword',
  pluralName: 'withpasswords',
  attributes: {
    field: {
      type: 'password',
    },
  },
};

describe('Test type password', () => {
  beforeAll(async () => {
    await builder.addContentType(ct).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Create entry with value input JSON', async () => {
    const res = await rq.post('/content-manager/collection-types/api::withpassword.withpassword', {
      body: {
        field: 'somePassword',
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.field).toBeUndefined();
  });

  test.todo('Should be private by default');

  test('Create entry with value input Formdata', async () => {
    const res = await rq.post('/content-manager/collection-types/api::withpassword.withpassword', {
      body: {
        field: '1234567',
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.field).toBeUndefined();
  });

  test('Reading entry returns correct value', async () => {
    const res = await rq.get('/content-manager/collection-types/api::withpassword.withpassword');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
    res.body.results.forEach((element) => {
      expect(element.field).toBeUndefined();
    });
  });

  test('Updating entry sets the right value and format', async () => {
    const res = await rq.post('/content-manager/collection-types/api::withpassword.withpassword', {
      body: {
        field: 'somePassword',
      },
    });

    const updateRes = await rq.put(
      `/content-manager/collection-types/api::withpassword.withpassword/${res.body.data.documentId}`,
      {
        body: {
          field: 'otherPwd',
        },
      }
    );

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.data).toMatchObject({
      documentId: res.body.data.documentId,
    });
    expect(res.body.data.field).toBeUndefined();
  });
});
