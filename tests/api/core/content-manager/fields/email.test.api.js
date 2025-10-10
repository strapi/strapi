'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;

const ct = {
  displayName: 'withemail',
  singularName: 'withemail',
  pluralName: 'withemails',
  attributes: {
    field: {
      type: 'email',
    },
  },
};

describe('Test type email', () => {
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
    const res = await rq.post('/content-manager/collection-types/api::withemail.withemail', {
      body: {
        field: 'validemail@test.fr',
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toMatchObject({
      field: 'validemail@test.fr',
    });
  });

  test('Should return 400 status on invalid email', async () => {
    const res = await rq.post('/content-manager/collection-types/api::withemail.withemail', {
      body: {
        field: 'invalidemail',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  test('Create entry with value input Formdata', async () => {
    const res = await rq.post('/content-manager/collection-types/api::withemail.withemail', {
      body: {
        field: 'test@email.fr',
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.data).toMatchObject({
      field: 'test@email.fr',
    });
  });

  test('Reading entry returns correct value', async () => {
    const res = await rq.get('/content-manager/collection-types/api::withemail.withemail');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: expect.any(String),
        }),
      ])
    );
  });

  test('Updating entry sets the right value and format', async () => {
    const res = await rq.post('/content-manager/collection-types/api::withemail.withemail', {
      body: {
        field: 'valid@email.fr',
      },
    });

    const updateRes = await rq.put(
      `/content-manager/collection-types/api::withemail.withemail/${res.body.data.documentId}`,
      {
        body: {
          field: 'new-email@email.fr',
        },
      }
    );

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.data).toMatchObject({
      documentId: res.body.data.documentId,
      field: 'new-email@email.fr',
    });
  });
});
