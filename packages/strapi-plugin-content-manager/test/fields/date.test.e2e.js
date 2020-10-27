'use strict';

const { registerAndLogin } = require('../../../../test/helpers/auth');
const createModelsUtils = require('../../../../test/helpers/models');
const { createAuthRequest } = require('../../../../test/helpers/request');

let modelsUtils;
let rq;

describe('Test type date', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);

    modelsUtils = createModelsUtils({ rq });

    await modelsUtils.createContentTypeWithType('withdate', 'date');
  }, 60000);

  afterAll(async () => {
    await modelsUtils.deleteContentType('withdate');
  }, 60000);

  test('Create entry with valid value JSON', async () => {
    const res = await rq.post('/content-manager/explorer/application::withdate.withdate', {
      body: {
        field: '2019-08-08',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: '2019-08-08',
    });
  });

  test('Create entry with valid value FormData', async () => {
    const now = new Date(2019, 0, 12);

    const res = await rq.post('/content-manager/explorer/application::withdate.withdate', {
      formData: {
        data: JSON.stringify({ field: now }),
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: '2019-01-12',
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
    const res = await rq.post('/content-manager/explorer/application::withdate.withdate', {
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
      const res = await rq.post('/content-manager/explorer/application::withdate.withdate', {
        body: {
          field: value,
        },
      });

      expect(res.statusCode).toBe(400);
    }
  );

  test('Reading entry, returns correct value', async () => {
    const res = await rq.get('/content-manager/explorer/application::withdate.withdate');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    res.body.forEach(entry => {
      expect(entry.field).toMatch(/^([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))$/);
    });
  });

  test('Updating entry sets the right value and format JSON', async () => {
    const now = new Date(2018, 7, 5);

    const res = await rq.post('/content-manager/explorer/application::withdate.withdate', {
      body: {
        field: now,
      },
    });

    const newDate = new Date(2017, 10, 23);
    const updateRes = await rq.put(
      `/content-manager/explorer/application::withdate.withdate/${res.body.id}`,
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
