// Helpers.
const { registerAndLogin } = require('../../../test/helpers/auth');
const createModelsUtils = require('../../../test/helpers/models');
const { createAuthRequest } = require('../../../test/helpers/request');

let modelsUtils;
let rq;
let uid = 'application::single-type-model.single-type-model';

describe('Content Manager single types', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);

    modelsUtils = createModelsUtils({ rq });

    await modelsUtils.createContentType({
      kind: 'singleType',
      name: 'single-type-model',
      attributes: {
        title: {
          type: 'string',
        },
      },
    });
  }, 60000);

  afterAll(() => modelsUtils.deleteContentType('single-type-model'), 60000);

  test('Label is not pluralized', async () => {
    const res = await rq({
      url: `/content-manager/schemas/content-types?kind=singleType`,
      method: 'GET',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Single-type-model',
        }),
      ])
    );
  });

  test('find single type content returns 404 when not created', async () => {
    const res = await rq({
      url: `/content-manager/explorer/${uid}`,
      method: 'GET',
    });

    expect(res.statusCode).toBe(404);
  });

  test('Create content', async () => {
    const res = await rq({
      url: `/content-manager/explorer/${uid}`,
      method: 'POST',
      body: {
        title: 'Title',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      id: expect.anything(),
      title: 'Title',
    });
  });

  test('find single type content returns an object ', async () => {
    const res = await rq({
      url: `/content-manager/explorer/${uid}`,
      method: 'GET',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      id: expect.anything(),
      title: 'Title',
    });
  });
});
