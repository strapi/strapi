/**
 * Integration test for the content-type-buidler content types managment apis
 */
'use strict';

const { registerAndLogin } = require('../../../test/helpers/auth');
const { createAuthRequest } = require('../../../test/helpers/request');
const waitRestart = require('../../../test/helpers/waitRestart');

let rq;

describe('Content Type Builder - Content types', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);
  }, 60000);

  afterEach(() => waitRestart());

  describe('Collection Types', () => {
    const collectionTypeUID =
      'application::test-collection-type.test-collection-type';

    test('Successfull creation of a collection type', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-type-builder/content-types',
        body: {
          contentType: {
            name: 'Test Collection Type',
            attributes: {
              title: {
                type: 'string',
              },
            },
          },
        },
      });

      expect(res.statusCode).toBe(201);
      expect(res.body).toEqual({
        data: {
          uid: collectionTypeUID,
        },
      });
    });

    test('Get collection type returns full schema and informations', async () => {
      const res = await rq({
        method: 'GET',
        url: `/content-type-builder/content-types/${collectionTypeUID}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchSnapshot();
    });
  });

  describe('Single Types', () => {
    const singleTypeUID = 'application::test-single-type.test-single-type';

    test('Successfull creation of a single type', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-type-builder/content-types',
        body: {
          contentType: {
            kind: 'singleType',
            name: 'Test Single Type',
            attributes: {
              title: {
                type: 'string',
              },
            },
          },
        },
      });

      expect(res.statusCode).toBe(201);
      expect(res.body).toEqual({
        data: {
          uid: singleTypeUID,
        },
      });
    });

    test('Get single type returns full schema and informations', async () => {
      const res = await rq({
        method: 'GET',
        url: `/content-type-builder/content-types/${singleTypeUID}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchSnapshot();
    });
  });
});
