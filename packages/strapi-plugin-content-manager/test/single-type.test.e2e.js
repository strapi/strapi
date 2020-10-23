'use strict';

// Helpers.
const { registerAndLogin } = require('../../../test/helpers/auth');
const createModelsUtils = require('../../../test/helpers/models');
const { createAuthRequest } = require('../../../test/helpers/request');
const createLockUtils = require('../../../test/helpers/editing-lock');

let modelsUtils;
let lockUtils;
let rq;
let uid = 'application::single-type-model.single-type-model';

describe('Content Manager single types', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);

    modelsUtils = createModelsUtils({ rq });
    lockUtils = createLockUtils({ rq });

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
      url: `/content-manager/content-types?kind=singleType`,
      method: 'GET',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          info: expect.objectContaining({
            label: 'Single-type-model',
          }),
        }),
      ])
    );
  });

  test('find single type content returns 404 when not created', async () => {
    const res = await rq({
      url: `/content-manager/single-types/${uid}`,
      method: 'GET',
    });

    expect(res.statusCode).toBe(404);
  });

  test('Create content', async () => {
    const lockUid = await lockUtils.getLockUid(uid, null, true);
    const res = await rq({
      url: `/content-manager/single-types/${uid}`,
      method: 'PUT',
      body: {
        title: 'Title',
      },
      qs: { uid: lockUid },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      id: expect.anything(),
      title: 'Title',
    });
  });

  test('find single type content returns an object ', async () => {
    const res = await rq({
      url: `/content-manager/single-types/${uid}`,
      method: 'GET',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      id: expect.anything(),
      title: 'Title',
    });
  });
});
