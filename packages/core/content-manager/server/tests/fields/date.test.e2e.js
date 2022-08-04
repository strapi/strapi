'use strict';

const { createTestBuilder } = require('../../../../../../test/helpers/builder');
const { createStrapiInstance } = require('../../../../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../../../../test/helpers/request');

const builder = createTestBuilder();
let strapi;
let rq;

const ct = {
  displayName: 'withdate',
  singularName: 'withdate',
  pluralName: 'withdates',
  attributes: {
    field: {
      type: 'date',
    },
  },
};

describe('Test type date', () => {
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
    const res = await rq.post('/content-manager/collection-types/api::withdate.withdate', {
      body: {
        field: '2019-08-08',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: '2019-08-08',
    });
  });

  test.each([
    '2019-08-08',
    '2019-08-08 12:11:12',
    '2019-08-08T00:00:00',
    '2019-08-08T00:00:00Z',
    '2019-08-08 00:00:00.123',
    '2019-08-08 00:00:00.123Z',
    '2019-08-08T00:00:00.123',
    '2019-08-08T00:00:00.123Z',
  ])('Date can be sent in any iso format and the date part will be kept, (%s)', async input => {
    const res = await rq.post('/content-manager/collection-types/api::withdate.withdate', {
      body: {
        field: input,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: '2019-08-08',
    });
  });

  test.each([1234567891012, '1234567891012', '2019/12/11', '12:11:11'])(
    'Throws on invalid date (%s)',
    async value => {
      const res = await rq.post('/content-manager/collection-types/api::withdate.withdate', {
        body: {
          field: value,
        },
      });

      expect(res.statusCode).toBe(400);
    }
  );

  test('Reading entry, returns correct value', async () => {
    const res = await rq.get('/content-manager/collection-types/api::withdate.withdate');

    expect(res.statusCode).toBe(200);
    expect(res.body.pagination).toBeDefined();
    expect(Array.isArray(res.body.results)).toBe(true);
    res.body.results.forEach(entry => {
      expect(entry.field).toMatch(/^([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))$/);
    });
  });

  test('Updating entry sets the right value and format JSON', async () => {
    const now = '2018-08-05';

    const res = await rq.post('/content-manager/collection-types/api::withdate.withdate', {
      body: {
        field: now,
      },
    });

    const newDate = '2017-11-23';
    const updateRes = await rq.put(
      `/content-manager/collection-types/api::withdate.withdate/${res.body.id}`,
      {
        body: {
          field: newDate,
        },
      }
    );

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body).toMatchObject({
      id: res.body.id,
      field: '2017-11-23',
    });
  });
});
