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

    await modelsUtils.createModelWithType('withdate', 'date');
  }, 60000);

  afterAll(async () => {
    await modelsUtils.deleteModel('withdate');
  }, 60000);

  test('Create entry with valid value JSON', async () => {
    const now = new Date();

    const res = await rq.post('/content-manager/explorer/withdate', {
      body: {
        field: now,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: now.toISOString(),
    });
  });

  test('Create entry with valid value FormData', async () => {
    const now = new Date();

    const res = await rq.post('/content-manager/explorer/withdate', {
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
    const now = new Date();

    const res = await rq.post('/content-manager/explorer/withdate', {
      body: {
        field: now.getTime(),
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      field: now.toISOString(),
    });
  });

  test('Throws on invalid date format', async () => {
    const now = new Date();

    const res = await rq.post('/content-manager/explorer/withdate', {
      body: {
        field: `${now.getTime()}`,
      },
    });

    expect(res.statusCode).toBe(400);
  });

  test('Reading entry, returns correct value', async () => {
    const res = await rq.get('/content-manager/explorer/withdate');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    res.body.forEach(entry => {
      expect(new Date(entry.field).toISOString()).toBe(entry.field);
    });
  });

  test('Updating entry sets the right value and format JSON', async () => {
    const now = new Date();

    const res = await rq.post('/content-manager/explorer/withdate', {
      body: {
        field: now.getTime(),
      },
    });

    const newDate = new Date();
    const updateRes = await rq.put(
      `/content-manager/explorer/withdate/${res.body.id}`,
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
