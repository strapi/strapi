/**
 * Integration test for the content-type-buidler content types managment apis
 */
'use strict';

const { registerAndLogin } = require('../../../test/helpers/auth');
const { createAuthRequest } = require('../../../test/helpers/request');
const waitRestart = require('../../../test/helpers/waitRestart');
const createModelsUtils = require('../../../test/helpers/models');

let rq;
let modelsUtils;

describe('Content Type Builder - Content types', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);
    modelsUtils = createModelsUtils({ rq });
  }, 60000);

  afterEach(() => waitRestart());

  afterAll(async () => {
    await modelsUtils.deleteContentTypes([
      'test-collection-type',
      'test-collection',
      'test-single-type',
      'ct-with-dp',
    ]);
  }, 60000);

  describe('Collection Types', () => {
    const testCollectionTypeUID = 'application::test-collection-type.test-collection-type';
    const ctWithDpUID = 'application::ct-with-dp.ct-with-dp';

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
          uid: testCollectionTypeUID,
        },
      });
    });

    test('Get collection type returns full schema and informations', async () => {
      const res = await rq({
        method: 'GET',
        url: `/content-type-builder/content-types/${testCollectionTypeUID}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchSnapshot();
    });

    test('Successfull creation of a collection type with draftAndPublish enabled', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-type-builder/content-types',
        body: {
          contentType: {
            name: 'CT with DP',
            draftAndPublish: true,
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
          uid: ctWithDpUID,
        },
      });
    });

    test('Get collection type returns full schema and informations with draftAndPublish', async () => {
      const res = await rq({
        method: 'GET',
        url: `/content-type-builder/content-types/${ctWithDpUID}`,
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

    test('Fails on invalid relations', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-type-builder/content-types',
        body: {
          contentType: {
            kind: 'singleType',
            name: 'test-st',
            attributes: {
              relation: {
                nature: 'oneToOne',
                target: 'plugins::users-permissions.user',
                targetAttribute: 'test',
              },
            },
          },
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        error: {
          ['contentType.attributes.relation.nature']: expect.arrayContaining([
            expect.stringMatching('must be one of the following values: oneWay, manyWay'),
          ]),
        },
      });
    });

    test('Cannot switch collectionType to singleType when multiple entries in DB', async () => {
      const createRes = await rq({
        method: 'POST',
        url: '/content-type-builder/content-types',
        body: {
          contentType: {
            kind: 'collectionType',
            name: 'test-collection',
            attributes: {
              title: {
                type: 'string',
              },
            },
          },
        },
      });

      expect(createRes.statusCode).toBe(201);

      await waitRestart();

      const { uid } = createRes.body.data;

      // create data
      for (let i = 0; i < 2; i++) {
        const res = await rq({
          method: 'POST',
          url: `/test-collections`,
          body: {
            title: 'Test',
          },
        });

        expect(res.statusCode).toBe(200);
      }

      const updateRes = await rq({
        method: 'PUT',
        url: `/content-type-builder/content-types/${uid}`,
        body: {
          contentType: {
            kind: 'singleType',
            name: 'test-collection',
            attributes: {
              title: {
                type: 'string',
              },
            },
          },
        },
      });

      expect(updateRes.statusCode).toBe(400);
      expect(updateRes.body.error).toMatch('multiple entries in DB');
    });
  });

  describe('Private relation field', () => {
    const singleTypeUID = 'application::test-single-type.test-single-type';

    test('should add a relation field', async () => {
      const res = await rq({
        method: 'PUT',
        url: `/content-type-builder/content-types/${singleTypeUID}`,
        body: {
          contentType: {
            kind: 'singleType',
            name: 'test-collection',
            attributes: {
              relation: {
                private: true,
                nature: 'oneWay',
                target: 'plugins::users-permissions.user',
                targetAttribute: 'test',
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

    test('should contain a private relation field', async () => {
      const res = await rq({
        method: 'GET',
        url: `/content-type-builder/content-types/${singleTypeUID}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.schema.attributes.relation).toBeDefined();
      expect(res.body.data.schema.attributes.relation.private).toBeTruthy();
    });
  });
});
