'use strict';

const { registerAndLogin } = require('../../../../test/helpers/auth');
const createModelsUtils = require('../../../../test/helpers/models');
const { createAuthRequest } = require('../../../../test/helpers/request');

let modelsUtils;
let rq;

describe('Test type integer', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);

    modelsUtils = createModelsUtils({ rq });

    await modelsUtils.createContentTypeWithType('withinteger', 'integer');
  }, 60000);

  afterAll(async () => {
    await modelsUtils.deleteContentType('withinteger');
  }, 60000);

  test('Create entry with value input JSON', async () => {
    const res = await rq.post('/content-manager/explorer/application::withinteger.withinteger', {
      body: {
        field: 123456,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: 123456,
    });
  });

  test('Create entry with value input Fromdata', async () => {
    const res = await rq.post('/content-manager/explorer/application::withinteger.withinteger', {
      formData: {
        data: JSON.stringify({ field: 123456 }),
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: 123456,
    });
  });

  // I don't think it will work everywhere ...
  test('Create entry with a string should cast the value', async () => {
    const res = await rq.post('/content-manager/explorer/application::withinteger.withinteger', {
      body: {
        field: '123456',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: 123456,
    });
  });

  test('Reading entry, returns correct value', async () => {
    const res = await rq.get('/content-manager/explorer/application::withinteger.withinteger');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    res.body.forEach(entry => {
      expect(Number.isInteger(entry.field)).toBe(true);
    });
  });

  test('Updating entry sets the right value and format', async () => {
    const res = await rq.post('/content-manager/explorer/application::withinteger.withinteger', {
      body: {
        field: 123,
      },
    });

    const updatedRes = await rq.put(
      `/content-manager/explorer/application::withinteger.withinteger/${res.body.id}`,
      {
        body: {
          field: 543,
        },
      }
    );

    expect(updatedRes.statusCode).toBe(200);
    expect(updatedRes.body).toMatchObject({
      id: res.body.id,
      field: 543,
    });
  });
});
