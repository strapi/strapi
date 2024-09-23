/**
 * Integration test for the content-type-builder content types management apis
 */

'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const modelsUtils = require('api-tests/models');
const { createTestBuilder } = require('api-tests/builder');
const { kebabCase } = require('lodash/fp');

let strapi;
let rq;

const restart = async () => {
  await strapi.destroy();
  strapi = await createStrapiInstance();
  rq = await createAuthRequest({ strapi });
};

const builder = createTestBuilder();

const localTestData = {
  models: {
    dog: {
      singularName: 'dog',
      pluralName: 'dogs',
      collectionName: 'dogs-collection',
      displayName: 'Dog Display',
      kind: 'collectionType',
      attributes: {
        name: {
          type: 'string',
        },
      },
    },
  },
};

describe('Content Type Builder - Content types', () => {
  beforeAll(async () => {
    await builder.addContentType(localTestData.models.dog).build();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterEach(async () => {
    await restart();
  });

  // TODO FIXME: this depends on all tests to run or else it throws an error
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
    await builder.cleanup();
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
            draftAndPublish: true,
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

    test('Successful creation of a collection type', async () => {
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

    test('Get collection type returns full schema and informations', async () => {
      const res = await rq({
        method: 'GET',
        url: `/content-type-builder/content-types/${ctWithDpUID}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchSnapshot();
    });

    test.each([
      ['singularName', 'singularName'],
      ['singularName', 'pluralName'],
      ['pluralName', 'singularName'],
      ['pluralName', 'pluralName'],
      ['pluralName', 'collectionName'],
    ])(`Cannot use %p that exists as another type's %p`, async (sourceField, matchField) => {
      const body = {
        contentType: {
          displayName: 'Frogs Frogs Frogs',
          pluralName: 'safe-plural-name',
          singularName: 'safe-singular-name',
          collectionName: 'safe-collection-name',
          attributes: {
            name: {
              type: 'string',
            },
          },
        },
      };

      // set the conflicting name in the given field
      body.contentType[sourceField] = localTestData.models.dog[matchField];

      const res = await rq({
        method: 'POST',
        url: '/content-type-builder/content-types',
        body,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        error: {
          details: {
            errors: [
              {
                message: `contentType: name \`${body.contentType[sourceField]}\` is already being used by another content type.`,
                name: 'ValidationError',
                path: ['contentType', sourceField],
              },
            ],
          },
          message: `contentType: name \`${body.contentType[sourceField]}\` is already being used by another content type.`,
          name: 'ValidationError',
        },
      });
    });

    test.each(['strapi', '_strapi', '__strapi'])(
      'Cannot use %s prefix for content type name',
      async (prefix) => {
        const res = await rq({
          method: 'POST',
          url: '/content-type-builder/content-types',
          body: {
            contentType: {
              displayName: 'unique string',
              singularName: `${kebabCase(prefix)}-singular`,
              pluralName: `${kebabCase(prefix)}-plural`,
              attributes: {
                [prefix]: {
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
                  message:
                    'Attribute keys cannot be one of id, document_id, created_at, updated_at, published_at, created_by_id, updated_by_id, created_by, updated_by, entry_id, status, localizations, meta, locale, __component, __contentType, strapi*, _strapi*, __strapi*',
                  name: 'ValidationError',
                  path: ['contentType', 'attributes', prefix],
                },
                {
                  message:
                    'Content Type name cannot be one of boolean, date, date_time, time, upload, document, then, strapi*, _strapi*, __strapi*',
                  name: 'ValidationError',
                  path: ['contentType', 'singularName'],
                },
                {
                  message:
                    'Content Type name cannot be one of boolean, date, date_time, time, upload, document, then, strapi*, _strapi*, __strapi*',
                  name: 'ValidationError',
                  path: ['contentType', 'pluralName'],
                },
              ],
            },
            message: '3 errors occurred',
            name: 'ValidationError',
          },
        });
      }
    );

    test('Cannot use same string for singularName and pluralName', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-type-builder/content-types',
        body: {
          contentType: {
            displayName: 'same string',
            singularName: 'same-string',
            pluralName: 'same-string',
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
                message: 'contentType.singularName is a required field',
                name: 'ValidationError',
                path: ['contentType', 'singularName'],
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
          message: '4 errors occurred',
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
            message: expect.stringContaining('errors occurred'),
            details: {
              errors: expect.arrayContaining([
                expect.objectContaining({
                  message: expect.stringContaining('contentType.singularName is not in kebab case'),
                  name: 'ValidationError',
                  path: expect.arrayContaining(['contentType', 'singularName']),
                }),
                expect.objectContaining({
                  message: expect.stringContaining('contentType.pluralName is not in kebab case'),
                  name: 'ValidationError',
                  path: expect.arrayContaining(['contentType', 'pluralName']),
                }),
              ]),
            },
          },
        });
      }
    });
  });
});
