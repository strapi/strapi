'use strict';

const { registerAndLogin } = require('../../../test/helpers/auth');
const createModelsUtils = require('../../../test/helpers/models');
const { createAuthRequest } = require('../../../test/helpers/request');

let rq;
let modelsUtils;
let baseUrl;
let crudUrl;
let isSingleType;
let data;

const getExpiresAtTime = lock => new Date(lock.expiresAt).getTime();
const getLastUpdatedAtTime = lock => new Date(lock.metadata.lastUpdatedAt).getTime();
const wait = time =>
  new Promise(resolve => {
    setTimeout(resolve, time);
  });

const productModel = {
  attributes: {
    name: {
      type: 'string',
      required: true,
    },
    description: {
      type: 'text',
      minLength: 4,
      maxLength: 30,
    },
  },
  draftAndPublish: true,
  connection: 'default',
  name: 'product',
  description: '',
  collectionName: '',
};

describe('Editing Lock', () => {
  describe.each([
    ['Collection-Type', 'product-ct'],
    ['Single-Type', 'product-st'],
  ])('%p', (kind, modelName) => {
    beforeAll(async () => {
      data = { products: [], locks: [] };
      isSingleType = kind === 'Single-Type';
      const token = await registerAndLogin();
      rq = createAuthRequest(token);
      modelsUtils = createModelsUtils({ rq });

      // create model
      productModel.name = modelName;
      if (isSingleType) {
        productModel.kind = 'singleType';
      }
      await modelsUtils.createContentTypes([productModel]);

      crudUrl = isSingleType
        ? `/content-manager/single-types/application::${modelName}.${modelName}`
        : `/content-manager/collection-types/application::${modelName}.${modelName}`;

      // create product
      const product = {
        name: 'Product 1',
        description: 'Product description',
      };
      const res = await rq({
        method: 'POST',
        url: crudUrl,
        body: product,
      });
      data.products.push(res.body);

      // define baseUrl
      baseUrl = isSingleType ? `${crudUrl}/actions` : `${crudUrl}/${data.products[0].id}/actions`;
    }, 60000);

    afterAll(async () => {
      await modelsUtils.deleteContentTypes([modelName]);
    }, 60000);

    test('Lock product', async () => {
      const res = await rq({
        method: 'POST',
        url: `${baseUrl}/lock`,
      });

      expect(res.body).toMatchObject({
        success: true,
        lockInfo: expect.objectContaining({
          uid: expect.any(String),
          metadata: {
            lastUpdatedAt: expect.any(String),
            lockedBy: {
              id: expect.anything(),
              firstname: expect.any(String),
              lastname: expect.anything(String),
              username: null,
            },
          },
          expiresAt: expect.any(String),
        }),
      });
      data.locks.push(res.body.lockInfo);
    });

    test('Get lock info for product (has not expired yet)', async () => {
      const res = await rq({
        method: 'GET',
        url: `${baseUrl}/lock`,
      });

      expect(res.body).toMatchObject({
        lockInfo: expect.objectContaining({
          metadata: data.locks[0].metadata,
          expiresAt: data.locks[0].expiresAt,
        }),
      });
    });

    test('Cannot lock product (force: false)', async () => {
      const res = await rq({
        method: 'POST',
        url: `${baseUrl}/lock`,
      });

      expect(res.body).toMatchObject({
        success: false,
        lockInfo: expect.objectContaining({
          metadata: data.locks[0].metadata,
          expiresAt: data.locks[0].expiresAt,
        }),
      });
    });

    test('Can lock product (force: true)', async () => {
      const res = await rq({
        method: 'POST',
        url: `${baseUrl}/lock`,
        body: { force: true },
      });

      expect(res.body).toMatchObject({
        success: true,
        lockInfo: expect.objectContaining({
          uid: expect.any(String),
          metadata: {
            ...data.locks[0].metadata,
            lastUpdatedAt: expect.any(String),
          },
          expiresAt: expect.any(String),
        }),
      });
      data.locks[0] = res.body.lockInfo;
    });

    test('lastUpdatedAt is updated when editing the entry', async () => {
      const product = {
        name: 'Product 1 updated',
        description: 'Updated Product description',
      };
      await rq({
        method: 'PUT',
        url: isSingleType ? crudUrl : `${crudUrl}/${data.products[0].id}`,
        body: product,
        qs: {
          uid: data.locks[0].uid,
        },
      });
      await wait(1000); // let the time for the lock to be automatically updated

      const { body } = await rq({
        method: 'GET',
        url: `${baseUrl}/lock`,
      });

      expect(getLastUpdatedAtTime(body.lockInfo) > getLastUpdatedAtTime(data.locks[0])).toBe(true);
      data.locks[0].metadata.lastUpdatedAt = body.lockInfo.metadata.lastUpdatedAt;
    });

    test.each(['publish', 'unpublish'])(
      'lastUpdatedAt is updated when %ping the entry',
      async action => {
        await rq({
          method: 'POST',
          url: `${baseUrl}/${action}`,
          qs: {
            uid: data.locks[0].uid,
          },
        });

        await wait(1000); // let the time for the lock to be automatically updated

        const { body } = await rq({
          method: 'GET',
          url: `${baseUrl}/lock`,
        });

        expect(getLastUpdatedAtTime(body.lockInfo) > getLastUpdatedAtTime(data.locks[0])).toBe(
          true
        );
        data.locks[0].metadata.lastUpdatedAt = body.lockInfo.metadata.lastUpdatedAt;
      }
    );

    test('Can extend product', async () => {
      const res = await rq({
        method: 'POST',
        url: `${baseUrl}/extend-lock`,
        body: { uid: data.locks[0].uid },
      });

      expect(res.body).toMatchObject({
        success: true,
        lockInfo: expect.objectContaining({
          metadata: data.locks[0].metadata,
          expiresAt: expect.any(String),
        }),
      });
      expect(getExpiresAtTime(res.body.lockInfo) > getExpiresAtTime(data.locks[0])).toBe(true);
      data.locks[0] = { ...data.locks[0], ...res.body.lockInfo };
    });

    test('Cannot extend product (wrong uid)', async () => {
      const res = await rq({
        method: 'POST',
        url: `${baseUrl}/extend-lock`,
        body: { uid: 'bad-uid' },
      });

      expect(res.body).toMatchObject({
        success: false,
        lockInfo: expect.objectContaining({
          metadata: data.locks[0].metadata,
          expiresAt: data.locks[0].expiresAt,
        }),
      });
    });

    test('Unlock product', async () => {
      const res = await rq({
        method: 'POST',
        url: `${baseUrl}/unlock`,
        body: {
          uid: data.locks[0].uid,
        },
      });

      expect(res.body).toMatchObject({
        success: true,
        lockInfo: expect.objectContaining({
          metadata: data.locks[0].metadata,
          expiresAt: expect.any(String),
        }),
      });
      expect(getExpiresAtTime(res.body.lockInfo) < Date.now()).toBe(true);
      data.locks[0].expiresAt = res.body.lockInfo.expiresAt;
    });

    test('Get lock info for product (has expired)', async () => {
      const res = await rq({
        method: 'GET',
        url: `${baseUrl}/lock`,
      });

      expect(res.body).toMatchObject({
        lockInfo: expect.objectContaining({
          metadata: data.locks[0].metadata,
          expiresAt: data.locks[0].expiresAt,
        }),
      });
    });

    test('Cannot unlock product if already expired', async () => {
      const res = await rq({
        method: 'POST',
        url: `${baseUrl}/unlock`,
        body: {
          uid: data.locks[0].uid,
        },
      });

      expect(res.body).toMatchObject({
        success: false,
        lockInfo: expect.objectContaining({
          metadata: data.locks[0].metadata,
          expiresAt: data.locks[0].expiresAt,
        }),
      });
    });
  });
});
