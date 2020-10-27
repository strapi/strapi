'use strict';

const { registerAndLogin } = require('../../../../test/helpers/auth');
const createModelsUtils = require('../../../../test/helpers/models');
const { createAuthRequest } = require('../../../../test/helpers/request');

let modelsUtils;
let rq;

describe('Test type boolean', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);

    modelsUtils = createModelsUtils({ rq });

    await modelsUtils.createContentTypeWithType('withboolean', 'boolean');
  }, 60000);

  afterAll(async () => {
    await modelsUtils.deleteContentType('withboolean');
  }, 60000);

  test('Create entry with value input JSON', async () => {
    const res = await rq.post('/content-manager/explorer/application::withboolean.withboolean', {
      body: {
        field: true,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: true,
    });
  });

  test('Create entry with value input FromData', async () => {
    const res = await rq.post('/content-manager/explorer/application::withboolean.withboolean', {
      formData: {
        data: JSON.stringify({ field: true }),
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: true,
    });
  });

  test('Throws on invalid boolean value', async () => {
    let res = await rq.post('/content-manager/explorer/application::withboolean.withboolean', {
      body: { field: 'random' },
    });

    expect(res.statusCode).toBe(400);
  });

  test('Convert integer to boolean value', async () => {
    let res = await rq.post('/content-manager/explorer/application::withboolean.withboolean', {
      body: { field: 1 },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: true,
    });

    res = await rq.post('/content-manager/explorer/application::withboolean.withboolean', {
      body: { field: 0 },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: false,
    });
  });

  test('Reading entry, returns correct value', async () => {
    const res = await rq.get('/content-manager/explorer/application::withboolean.withboolean');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: expect.any(Boolean),
        }),
      ])
    );
  });

  test('Updating entry sets the right value and format', async () => {
    const res = await rq.post('/content-manager/explorer/application::withboolean.withboolean', {
      body: {
        field: true,
      },
    });

    const updateRes = await rq.put(
      `/content-manager/explorer/application::withboolean.withboolean/${res.body.id}`,
      {
        body: {
          field: false,
        },
      }
    );

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body).toMatchObject({
      id: res.body.id,
      field: false,
    });
  });
});
