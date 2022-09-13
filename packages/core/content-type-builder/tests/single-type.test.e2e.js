/**
 * Integration test for the content-type-builder content types management apis
 */

'use strict';

const { createStrapiInstance } = require('../../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../../test/helpers/request');
const modelsUtils = require('../../../../test/helpers/models');

let strapi;
let rq;

const restart = async () => {
  await strapi.destroy();
  strapi = await createStrapiInstance();
  rq = await createAuthRequest({ strapi });
};

describe('Content Type Builder - Content types', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterEach(async () => {
    await restart();
  });

  afterAll(async () => {
    const modelsUIDs = [
      'api::test-collection.test-collection',
      'api::test-single-type.test-single-type',
    ];

    await modelsUtils.cleanupModels(modelsUIDs, { strapi });
    await modelsUtils.deleteContentTypes(modelsUIDs, { strapi });

    await strapi.destroy();
  });

  describe('Single Types', () => {
    const singleTypeUID = 'api::test-single-type.test-single-type';

    test('Successful creation of a single type', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-type-builder/content-types',
        body: {
          contentType: {
            kind: 'singleType',
            displayName: 'Test Single Type',
            singularName: 'test-single-type',
            pluralName: 'test-single-types',
            pluginOptions: {
              i18n: {
                localized: true,
              },
            },
            attributes: {
              title: {
                type: 'string',
                pluginOptions: {
                  i18n: {
                    localized: true,
                  },
                },
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

    test('Get single type returns full schema and information', async () => {
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
            singularName: 'test-st',
            pluralName: 'test-sts',
            displayName: 'Tests-st',
            attributes: {
              relation: {
                type: 'relation',
                relation: 'oneTo',
                target: 'plugin::users-permissions.user',
                targetAttribute: 'test',
              },
            },
          },
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        error: {
          details: {
            errors: [
              {
                message:
                  'must be one of the following values: oneToOne, oneToMany, morphOne, morphMany, morphToOne, morphToMany',
                name: 'ValidationError',
                path: ['contentType', 'attributes', 'relation', 'relation'],
              },
            ],
          },
          message:
            'must be one of the following values: oneToOne, oneToMany, morphOne, morphMany, morphToOne, morphToMany',
          name: 'ValidationError',
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
            displayName: 'test-collection',
            singularName: 'test-collection',
            pluralName: 'test-collections',
            attributes: {
              title: {
                type: 'string',
              },
            },
          },
        },
      });

      expect(createRes.statusCode).toBe(201);

      await restart();

      const { uid } = createRes.body.data;

      // create data
      for (let i = 0; i < 2; i++) {
        await strapi.query(uid).create({ data: { title: 'Test' } });
      }

      const updateRes = await rq({
        method: 'PUT',
        url: `/content-type-builder/content-types/${uid}`,
        body: {
          contentType: {
            kind: 'singleType',
            displayName: 'test-collection',
            singularName: 'test-collection',
            pluralName: 'test-collections',
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

    test('Should add a relation field', async () => {
      const res = await rq({
        method: 'PUT',
        url: `/content-type-builder/content-types/${singleTypeUID}`,
        body: {
          contentType: {
            kind: 'singleType',
            displayName: 'test-collection',
            singularName: 'test-collection',
            pluralName: 'test-collections',
            attributes: {
              relation: {
                private: true,
                type: 'relation',
                relation: 'oneToOne',
                target: 'plugin::users-permissions.user',
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

    test('Should contain a private relation field', async () => {
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
