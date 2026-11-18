/**
 * Requests that used to crash the develop process: an enumeration without values, and a
 * content-type.update listener that throws after a kind change
 */

'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const UID = 'api::crash-guard.crash-guard';

let strapi;
let rq;

const restart = async () => {
  await strapi.destroy();
  strapi = await createStrapiInstance();
  rq = await createAuthRequest({ strapi });
};

const contentType = (kind, attributes) => ({
  displayName: 'Crash Guard',
  singularName: 'crash-guard',
  pluralName: 'crash-guards',
  kind,
  draftAndPublish: false,
  attributes,
});

describe('Content Type Builder - crash guards', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    if (strapi.contentTypes[UID] !== undefined) {
      await rq({ method: 'DELETE', url: `/content-type-builder/content-types/${UID}` });
    }

    await strapi.destroy();
  });

  describe('enumeration without values', () => {
    test.each([
      ['missing', { type: 'enumeration' }],
      ['null', { type: 'enumeration', enum: null }],
    ])('POST /content-types answers a validation error when enum is %s', async (_, level) => {
      const res = await rq({
        method: 'POST',
        url: '/content-type-builder/content-types',
        body: { contentType: contentType('collectionType', { level }) },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatchObject({
        name: 'ValidationError',
        details: {
          errors: expect.arrayContaining([
            expect.objectContaining({ path: ['contentType', 'attributes', 'level', 'enum'] }),
          ]),
        },
      });
      expect(strapi.contentTypes[UID]).toBeUndefined();
    });

    test('POST /components answers a validation error when enum is missing', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-type-builder/components',
        body: {
          component: {
            category: 'crashguard',
            displayName: 'Level',
            icon: 'cube',
            attributes: { level: { type: 'enumeration' } },
          },
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatchObject({
        name: 'ValidationError',
        details: {
          errors: expect.arrayContaining([
            expect.objectContaining({ path: ['component', 'attributes', 'level', 'enum'] }),
          ]),
        },
      });
      expect(strapi.components['crashguard.level']).toBeUndefined();
    });
  });

  describe('kind change with a throwing content-type.update listener', () => {
    beforeAll(async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-type-builder/content-types',
        body: { contentType: contentType('collectionType', { title: { type: 'string' } }) },
      });
      expect(res.statusCode).toBe(201);

      await restart();
    });

    test('PUT /content-types/:uid saves the kind change and logs the listener error', async () => {
      strapi.eventHub.on('content-type.update', () => {
        throw new Error('crash guard listener failed');
      });
      const logError = jest.spyOn(strapi.log, 'error');

      const res = await rq({
        method: 'PUT',
        url: `/content-type-builder/content-types/${UID}`,
        body: { contentType: contentType('singleType', { title: { type: 'string' } }) },
      });

      expect(res.statusCode).toBe(201);
      expect(res.body).toEqual({ data: { uid: UID } });
      expect(logError).toHaveBeenCalledWith(
        'A content-type.update listener failed: crash guard listener failed'
      );

      // The core router memoizes its routes per module, so reload the app modules as a new process would
      jest.resetModules();
      await restart();

      expect(strapi.contentTypes[UID].kind).toBe('singleType');
    });
  });
});
