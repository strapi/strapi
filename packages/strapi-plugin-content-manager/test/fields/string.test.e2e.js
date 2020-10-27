'use strict';

const { registerAndLogin } = require('../../../../test/helpers/auth');
const createModelsUtils = require('../../../../test/helpers/models');
const { createAuthRequest } = require('../../../../test/helpers/request');

let modelsUtils;
let rq;

describe('Test type string', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);

    modelsUtils = createModelsUtils({ rq });

    await modelsUtils.createContentTypeWithType('withstring', 'string');
  }, 60000);

  afterAll(async () => {
    await modelsUtils.deleteContentType('withstring');
  }, 60000);

  test('Creates an entry with JSON', async () => {
    const res = await rq.post('/content-manager/explorer/application::withstring.withstring', {
      body: {
        field: 'Some string',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: 'Some string',
    });
  });

  test('Creates an entry with formData', async () => {
    const res = await rq.post('/content-manager/explorer/application::withstring.withstring', {
      formData: {
        data: JSON.stringify({ field: '"Some string"' }),
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: '"Some string"',
    });
  });

  test('Reading entry, returns correct value', async () => {
    const res = await rq.get('/content-manager/explorer/application::withstring.withstring');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: expect.any(String),
        }),
      ])
    );
  });

  test('Updating entry with JSON sets the right value and format', async () => {
    const res = await rq.post('/content-manager/explorer/application::withstring.withstring', {
      body: { field: 'Some string' },
    });

    const updateRes = await rq.put(
      `/content-manager/explorer/application::withstring.withstring/${res.body.id}`,
      {
        body: { field: 'Updated string' },
      }
    );
    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body).toMatchObject({
      id: res.body.id,
      field: 'Updated string',
    });
  });

  test('Updating entry with Formdata sets the right value and format', async () => {
    const res = await rq.post('/content-manager/explorer/application::withstring.withstring', {
      formData: {
        data: JSON.stringify({ field: 'Some string' }),
      },
    });

    const updateRes = await rq.put(
      `/content-manager/explorer/application::withstring.withstring/${res.body.id}`,
      {
        formData: {
          data: JSON.stringify({ field: 'Updated string' }),
        },
      }
    );
    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body).toMatchObject({
      id: res.body.id,
      field: 'Updated string',
    });
  });
});
