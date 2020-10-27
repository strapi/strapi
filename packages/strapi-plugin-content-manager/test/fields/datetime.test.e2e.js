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

    await modelsUtils.createContentTypeWithType('withdatetime', 'datetime');
  }, 60000);

  afterAll(async () => {
    await modelsUtils.deleteContentType('withdatetime');
  }, 60000);

  test('Create entry with valid value JSON', async () => {
    const res = await rq.post('/content-manager/explorer/application::withdatetime.withdatetime', {
      body: {
        field: '2019-08-08T10:10:57.000Z',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: '2019-08-08T10:10:57.000Z',
    });
  });

  test('Create entry with valid value FormData', async () => {
    const now = new Date(2019, 0, 12);

    const res = await rq.post('/content-manager/explorer/application::withdatetime.withdatetime', {
      formData: {
        data: JSON.stringify({ field: now }),
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: now.toISOString(),
    });
  });

  test('Create entry with timestamp value should be converted to ISO', async () => {
    const now = new Date(2016, 4, 8);

    const res = await rq.post('/content-manager/explorer/application::withdatetime.withdatetime', {
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

    const res = await rq.post('/content-manager/explorer/application::withdatetime.withdatetime', {
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
    const res = await rq.post('/content-manager/explorer/application::withdatetime.withdatetime', {
      body: {
        field: 'azdazindoaizdnoainzd',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  test('Reading entry, returns correct value', async () => {
    const res = await rq.get('/content-manager/explorer/application::withdatetime.withdatetime');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    res.body.forEach(entry => {
      expect(new Date(entry.field).toISOString()).toBe(entry.field);
    });
  });

  test('Updating entry sets the right value and format JSON', async () => {
    const now = new Date(2018, 7, 5);

    const res = await rq.post('/content-manager/explorer/application::withdatetime.withdatetime', {
      body: {
        field: now.getTime(),
      },
    });

    const newDate = new Date(2017, 10, 23);
    const updateRes = await rq.put(
      `/content-manager/explorer/application::withdatetime.withdatetime/${res.body.id}`,
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
