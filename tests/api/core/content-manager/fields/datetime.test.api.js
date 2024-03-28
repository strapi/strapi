'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;

const ct = {
  displayName: 'withdatetime',
  singularName: 'withdatetime',
  pluralName: 'withdatetimes',
  attributes: {
    field: {
      type: 'datetime',
    },
  },
};

describe('Test type datetime', () => {
  beforeAll(async () => {
    await builder.addContentType(ct).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Create entry with valid value JSON', async () => {
    const res = await rq.post('/content-manager/collection-types/api::withdatetime.withdatetime', {
      body: {
        field: '2019-08-08T10:10:57.000Z',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: '2019-08-08T10:10:57.000Z',
    });
  });

  test('Create entry with timestamp value should be converted to ISO', async () => {
    const now = new Date(2016, 4, 8);

    const res = await rq.post('/content-manager/collection-types/api::withdatetime.withdatetime', {
      body: {
        field: now.getTime(),
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: now.toISOString(),
    });
  });

  test('Accepts string timestamp', async () => {
    const now = new Date(2000, 0, 1);

    const res = await rq.post('/content-manager/collection-types/api::withdatetime.withdatetime', {
      body: {
        field: `${now.getTime()}`,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: now.toISOString(),
    });
  });

  test('Throws on invalid date format', async () => {
    const res = await rq.post('/content-manager/collection-types/api::withdatetime.withdatetime', {
      body: {
        field: 'azdazindoaizdnoainzd',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  test('Reading entry, returns correct value', async () => {
    const res = await rq.get('/content-manager/collection-types/api::withdatetime.withdatetime');

    expect(res.statusCode).toBe(200);
    expect(res.body.pagination).toBeDefined();
    expect(Array.isArray(res.body.results)).toBe(true);
    res.body.results.forEach((entry) => {
      expect(new Date(entry.field).toISOString()).toBe(entry.field);
    });
  });

  test('Updating entry sets the right value and format JSON', async () => {
    const now = new Date(2018, 7, 5);

    const res = await rq.post('/content-manager/collection-types/api::withdatetime.withdatetime', {
      body: {
        field: now.getTime(),
      },
    });

    const newDate = new Date(2017, 10, 23);
    const updateRes = await rq.put(
      `/content-manager/collection-types/api::withdatetime.withdatetime/${res.body.id}`,
      {
        body: {
          field: newDate,
        },
      }
    );

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body).toMatchObject({
      id: res.body.id,
      field: newDate.toISOString(),
    });
  });
});
