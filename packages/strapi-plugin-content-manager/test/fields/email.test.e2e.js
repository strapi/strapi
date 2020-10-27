'use strict';

const { registerAndLogin } = require('../../../../test/helpers/auth');
const createModelsUtils = require('../../../../test/helpers/models');
const { createAuthRequest } = require('../../../../test/helpers/request');

let modelsUtils;
let rq;

describe('Test type email', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);

    modelsUtils = createModelsUtils({ rq });

    await modelsUtils.createContentTypeWithType('withemail', 'email');
  }, 60000);

  afterAll(async () => {
    await modelsUtils.deleteContentType('withemail');
  }, 60000);

  test('Create entry with value input JSON', async () => {
    const res = await rq.post('/content-manager/explorer/application::withemail.withemail', {
      body: {
        field: 'validemail@test.fr',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: 'validemail@test.fr',
    });
  });

  test('Should Throw on invalid email', async () => {
    const res = await rq.post('/content-manager/explorer/application::withemail.withemail', {
      body: {
        field: 'invalidemail',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  test('Create entry with value input Formdata', async () => {
    const res = await rq.post('/content-manager/explorer/application::withemail.withemail', {
      body: {
        field: 'test@email.fr',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: 'test@email.fr',
    });
  });

  test('Reading entry returns correct value', async () => {
    const res = await rq.get('/content-manager/explorer/application::withemail.withemail');

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

  test('Updating entry sets the right value and format', async () => {
    const res = await rq.post('/content-manager/explorer/application::withemail.withemail', {
      body: {
        field: 'valid@email.fr',
      },
    });

    const updateRes = await rq.put(
      `/content-manager/explorer/application::withemail.withemail/${res.body.id}`,
      {
        body: {
          field: 'new-email@email.fr',
        },
      }
    );

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body).toMatchObject({
      id: res.body.id,
      field: 'new-email@email.fr',
    });
  });
});
