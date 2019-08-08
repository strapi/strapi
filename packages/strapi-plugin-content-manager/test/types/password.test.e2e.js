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

  test.todo('Reading entry, returns correct value');

  test.todo('Updating entry sets the right value and format');
});
