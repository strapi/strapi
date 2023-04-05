/**
 * Integration test for the content-type-builder content types management apis
 */

'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const modelsUtils = require('api-tests/models');

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
      'api::test-collection-type.test-collection-type',
      'api::ct-with-dp.ct-with-dp',
      'api::kebab-case.kebab-case',
      'api::my2space.my2space',
      'api::my-3-space.my-3-space',
    ];

    await modelsUtils.cleanupModels(modelsUIDs, { strapi });
    await modelsUtils.deleteContentTypes(modelsUIDs, { strapi });

    await strapi.destroy();
  });

  describe('Collection Types', () => {
    const testCollectionTypeUID = 'api::test-collection-type.test-collection-type';
    const ctWithDpUID = 'api::ct-with-dp.ct-with-dp';

    test('Successful creation of a collection type', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-type-builder/content-types',
        body: {
          contentType: {
            displayName: 'Test Collection Type',
            singularName: 'test-collection-type',
            pluralName: 'test-collection-types',
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
          uid: testCollectionTypeUID,
        },
      });
    });

    test('Get collection type returns full schema and information', async () => {
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
            displayName: 'CT with DP',
            singularName: 'ct-with-dp',
            pluralName: 'ct-with-dps',
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

    test('Cannot use same string for singularName and pluralName', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-type-builder/content-types',
        body: {
          contentType: {
            displayName: 'same string',
            singularName: 'same-string',
            pluralName: 'same-string',
            draftAndPublish: true,
            attributes: {
              title: {
                type: 'string',
              },
            },
          },
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        error: {
          details: {
            errors: [
              {
                message: 'contentType: singularName and pluralName should be different',
                name: 'ValidationError',
                path: ['contentType'],
              },
            ],
          },
          message: 'contentType: singularName and pluralName should be different',
          name: 'ValidationError',
        },
      });
    });

    test('displayName, singularName and pluralName are required', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-type-builder/content-types',
        body: {
          contentType: {
            draftAndPublish: true,
            attributes: {
              title: {
                type: 'string',
              },
            },
          },
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        error: {
          details: {
            errors: [
              {
                message: 'contentType.displayName is a required field',
                name: 'ValidationError',
                path: ['contentType', 'displayName'],
              },
              {
                message: 'Content Type name `undefined` is already being used.',
                name: 'ValidationError',
                path: ['contentType', 'singularName'],
              },
              {
                message: 'contentType.singularName is a required field',
                name: 'ValidationError',
                path: ['contentType', 'singularName'],
              },
              {
                message: 'Content Type name `undefined` is already being used.',
                name: 'ValidationError',
                path: ['contentType', 'pluralName'],
              },
              {
                message: 'contentType.pluralName is a required field',
                name: 'ValidationError',
                path: ['contentType', 'pluralName'],
              },
              {
                message: 'contentType: singularName and pluralName should be different',
                name: 'ValidationError',
                path: ['contentType'],
              },
            ],
          },
          message: '6 errors occurred',
          name: 'ValidationError',
        },
      });
    });

    test('Can edit displayName but singularName and pluralName are ignored', async () => {
      const uid = 'api::ct-with-dp.ct-with-dp';
      let res = await rq({
        method: 'PUT',
        url: `/content-type-builder/content-types/${uid}`,
        body: {
          contentType: {
            displayName: 'new displayName',
            singularName: 'ct-with-dp-new',
            pluralName: 'ct-with-dps-new',
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

      await restart();

      res = await rq({
        method: 'GET',
        url: `/content-type-builder/content-types/${uid}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        data: {
          uid,
          schema: {
            displayName: 'new displayName',
            singularName: 'ct-with-dp', // no change
            pluralName: 'ct-with-dps',
            draftAndPublish: true,
            attributes: {
              title: {
                type: 'string',
              },
            },
          },
        },
      });
    });

    test.each([
      ['kebab-case', 'kebab-cases', true],
      ['Kebab-case', 'Kebab-cases', false],
      ['kebab case', 'kebab cases', false],
      ['kebabCase', 'kebabCases', false],
      ['kebab@case', 'kebab@cases', false],
      ['my2space', 'my2spaces', true],
      ['2myspace', '2myspaces', false],
      ['my-3-space', 'my-3-spaces', true],
    ])('Are "%s" and "%s" valid: %s', async (singularName, pluralName, isExpectedValid) => {
      const res = await rq({
        method: 'POST',
        url: '/content-type-builder/content-types',
        body: {
          contentType: {
            displayName: 'same string',
            singularName,
            pluralName,
            draftAndPublish: true,
            attributes: {
              title: {
                type: 'string',
              },
            },
          },
        },
      });

      if (isExpectedValid) {
        expect(res.statusCode).toBe(201);
      } else {
        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({
          error: {
            name: 'ValidationError',
            message: '2 errors occurred',
            details: {
              errors: [
                {
                  message:
                    'contentType.singularName is not in kebab case (an-example-of-kebab-case)',
                  name: 'ValidationError',
                  path: ['contentType', 'singularName'],
                },
                {
                  message: 'contentType.pluralName is not in kebab case (an-example-of-kebab-case)',
                  name: 'ValidationError',
                  path: ['contentType', 'pluralName'],
                },
              ],
            },
          },
        });
      }
    });
  });
});
