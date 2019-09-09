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

    await modelsUtils.createModelWithType('withemail', 'email');
  }, 60000);

  afterAll(async () => {
    await modelsUtils.deleteModel('withemail');
  }, 60000);

  test('Create entry with value input JSON', async () => {
    const res = await rq.post('/content-manager/explorer/withemail', {
      body: {
        field: 'someemail',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: 'someemail',
    });
  });

  test.todo('Should Throw on invalid email');

  test('Create entry with value input Formdata', async () => {
    const res = await rq.post('/content-manager/explorer/withemail', {
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
    const res = await rq.get('/content-manager/explorer/withemail');

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
    const res = await rq.post('/content-manager/explorer/withemail', {
      body: {
        field: 'someemail',
      },
    });

    const updateRes = await rq.put(
      `/content-manager/explorer/withemail/${res.body.id}`,
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
