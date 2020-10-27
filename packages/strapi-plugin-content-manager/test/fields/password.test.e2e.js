'use strict';

const { registerAndLogin } = require('../../../../test/helpers/auth');
const createModelsUtils = require('../../../../test/helpers/models');
const { createAuthRequest } = require('../../../../test/helpers/request');

let modelsUtils;
let rq;

describe('Test type password', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);

    modelsUtils = createModelsUtils({ rq });

    await modelsUtils.createContentTypeWithType('withpassword', 'password');
  }, 60000);

  afterAll(async () => {
    await modelsUtils.deleteContentType('withpassword');
  }, 60000);

  test('Create entry with value input JSON', async () => {
    const res = await rq.post('/content-manager/explorer/application::withpassword.withpassword', {
      body: {
        field: 'somePassword',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.field).toBeUndefined();
  });

  test.todo('Should be private by default');

  test('Create entry with value input Formdata', async () => {
    const res = await rq.post('/content-manager/explorer/application::withpassword.withpassword', {
      body: {
        field: '1234567',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.field).toBeUndefined();
  });

  test('Reading entry returns correct value', async () => {
    const res = await rq.get('/content-manager/explorer/application::withpassword.withpassword');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    res.body.forEach(element => {
      expect(element.field).toBeUndefined();
    });
  });

  test('Updating entry sets the right value and format', async () => {
    const res = await rq.post('/content-manager/explorer/application::withpassword.withpassword', {
      body: {
        field: 'somePassword',
      },
    });

    const updateRes = await rq.put(
      `/content-manager/explorer/application::withpassword.withpassword/${res.body.id}`,
      {
        body: {
          field: 'otherPwd',
        },
      }
    );

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body).toMatchObject({
      id: res.body.id,
    });
    expect(res.body.field).toBeUndefined();
  });
});
