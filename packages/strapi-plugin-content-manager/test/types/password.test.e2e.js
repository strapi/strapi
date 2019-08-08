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

    await modelsUtils.createModelWithType('withpassword', 'password');
  }, 60000);

  afterAll(async () => {
    await modelsUtils.deleteModel('withpassword');
  }, 60000);

  test('Create entry with value input JSON', async () => {
    const res = await rq.post('/content-manager/explorer/withpassword', {
      body: {
        field: 'somePassword',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: 'somePassword',
    });
  });

  test.todo('Should be private by default');

  test('Create entry with value input Formdata', async () => {
    const res = await rq.post('/content-manager/explorer/withpassword', {
      body: {
        field: 1234567,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: '1234567',
    });
  });

  test('Reading entry returns correct value', async () => {
    const res = await rq.get('/content-manager/explorer/withpassword');

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
    const res = await rq.post('/content-manager/explorer/withpassword', {
      body: {
        field: 'somePassword',
      },
    });

    const updateRes = await rq.put(
      `/content-manager/explorer/withpassword/${res.body.id}`,
      {
        body: {
          field: 'otherPwd',
        },
      }
    );

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body).toMatchObject({
      id: res.body.id,
      field: 'otherPwd',
    });
  });
});
