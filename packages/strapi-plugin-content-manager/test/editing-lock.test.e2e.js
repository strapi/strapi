'use strict';

const _ = require('lodash');

const { registerAndLogin } = require('../../../test/helpers/auth');
const createModelsUtils = require('../../../test/helpers/models');
const { createAuthRequest } = require('../../../test/helpers/request');

let rq;
let modelsUtils;
let crudUrl;
let baseUrl;
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

      baseUrl = isSingleType
        ? `/content-manager/single-types/application::${modelName}.${modelName}`
        : `/content-manager/collection-types/application::${modelName}.${modelName}`;

      // create product
      const product = {
        name: 'Product 1',
        description: 'Product description',
      };
      const res = await rq({
        method: 'POST',
        url: baseUrl,
        body: product,
      });
      data.products.push(res.body);

      crudUrl = isSingleType ? baseUrl : `${baseUrl}/${data.products[0].id}`;
    }, 60000);

    afterAll(async () => {
      await modelsUtils.deleteContentTypes([modelName]);
    }, 60000);

    describe('Lock system', () => {
      test('Lock product', async () => {
        const res = await rq({
          method: 'POST',
          url: `${crudUrl}/actions/lock`,
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
          url: `${crudUrl}/actions/lock`,
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
          url: `${crudUrl}/actions/lock`,
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
          url: `${crudUrl}/actions/lock`,
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
          url: crudUrl,
          body: product,
          qs: {
            uid: data.locks[0].uid,
          },
        });
        await wait(1000); // let the time for the lock to be automatically updated

        const { body } = await rq({
          method: 'GET',
          url: `${crudUrl}/actions/lock`,
        });

        expect(getLastUpdatedAtTime(body.lockInfo) > getLastUpdatedAtTime(data.locks[0])).toBe(
          true
        );
        data.locks[0].metadata.lastUpdatedAt = body.lockInfo.metadata.lastUpdatedAt;
      });

      test.each(['publish', 'unpublish'])(
        'lastUpdatedAt is updated when %ping the entry',
        async action => {
          await rq({
            method: 'POST',
            url: `${crudUrl}/actions/${action}`,
            qs: {
              uid: data.locks[0].uid,
            },
          });

          await wait(1000); // let the time for the lock to be automatically updated

          const { body } = await rq({
            method: 'GET',
            url: `${crudUrl}/actions/lock`,
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
          url: `${crudUrl}/actions/extend-lock`,
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
          url: `${crudUrl}/actions/extend-lock`,
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
          url: `${crudUrl}/actions/unlock`,
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
          url: `${crudUrl}/actions/lock`,
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
          url: `${crudUrl}/actions/unlock`,
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

    describe('Actions with lock required ', () => {
      describe('Should fail if no lock', () => {
        test('update', async () => {
          const res = await rq({
            method: 'PUT',
            url: crudUrl,
          });

          expect(res.statusCode).toBe(400);
          expect(res.body.message).toBe('uid query param is invalid');
        });

        test('publish', async () => {
          const res = await rq({
            method: 'POST',
            url: `${crudUrl}/actions/publish`,
          });

          expect(res.statusCode).toBe(400);
          expect(res.body.message).toBe('uid query param is invalid');
        });

        test('unpublish', async () => {
          const res = await rq({
            method: 'POST',
            url: `${crudUrl}/actions/unpublish`,
          });

          expect(res.statusCode).toBe(400);
          expect(res.body.message).toBe('uid query param is invalid');
        });

        test('delete', async () => {
          const res = await rq({
            method: 'delete',
            url: crudUrl,
          });

          expect(res.statusCode).toBe(400);
          expect(res.body.message).toBe('uid query param is invalid');
        });
      });

      describe('Should succeed if valid lock', () => {
        const getLockUid = async () => {
          const res = await rq({
            method: 'POST',
            url: `${crudUrl}/actions/lock`,
            body: { force: true },
          });
          return _.get(res, 'body.lockInfo.uid');
        };

        test('update', async () => {
          const uid = await getLockUid();
          const res = await rq({
            method: 'PUT',
            url: crudUrl,
            body: { name: 'product 1 updated' },
            qs: { uid },
          });

          expect(res.statusCode).toBe(200);
        });

        test('publish', async () => {
          const uid = await getLockUid();
          const res = await rq({
            method: 'POST',
            url: `${crudUrl}/actions/publish`,
            qs: { uid },
          });

          expect(res.statusCode).toBe(200);
        });

        test('unpublish', async () => {
          const uid = await getLockUid();
          const res = await rq({
            method: 'POST',
            url: `${crudUrl}/actions/unpublish`,
            qs: { uid },
          });

          expect(res.statusCode).toBe(200);
        });

        test('delete', async () => {
          const uid = await getLockUid();
          const res = await rq({
            method: 'delete',
            url: crudUrl,
            qs: { uid },
          });

          expect(res.statusCode).toBe(200);
        });
      });

      describe('Should still succeed without lock', () => {
        test('bulkDelete', async () => {
          if (isSingleType) return; // only applies to collection-types

          const productToCreate = { name: 'product 2' };
          const createRes = await rq({
            method: 'POST',
            url: baseUrl,
            body: productToCreate,
          });
          expect(createRes.body).toMatchObject(productToCreate);

          const deleteRes = await rq({
            method: 'POST',
            url: `${baseUrl}/actions/bulkDelete`,
            body: { ids: [createRes.body.id] },
          });
          expect(deleteRes.statusCode).toBe(200);
          expect(deleteRes.body[0]).toMatchObject(productToCreate);
        });
      });
    });
  });
});
