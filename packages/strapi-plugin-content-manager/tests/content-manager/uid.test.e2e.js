'use strict';

// Helpers.
const { createTestBuilder } = require('../../../../test/helpers/builder');
const { createStrapiInstance } = require('../../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../../test/helpers/request');

const builder = createTestBuilder();
let strapi;
let rq;
let uid = 'application::uid-model.uid-model';

const model = {
  kind: 'collectionType',
  name: 'uid-model',
  attributes: {
    title: {
      type: 'string',
    },
    slug: {
      type: 'uid',
      targetField: 'title',
    },
    otherField: {
      type: 'integer',
    },
  },
};

describe('Content Manager single types', () => {
  beforeAll(async () => {
    await builder.addContentType(model).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Generate UID', () => {
    test('Throws if input is not provided', async () => {
      const res = await rq({
        url: `/content-manager/uid/generate`,
        method: 'POST',
        body: {},
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
        message: 'ValidationError',
        data: {
          contentTypeUID: expect.arrayContaining([expect.stringMatching('required field')]),
          field: expect.arrayContaining([expect.stringMatching('required field')]),
          data: expect.arrayContaining([expect.stringMatching('required field')]),
        },
      });
    });

    test('Throws when contentType is not found', async () => {
      const res = await rq({
        url: `/content-manager/uid/generate`,
        method: 'POST',
        body: {
          contentTypeUID: 'non-existent',
          field: 'slug',
          data: {},
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'ValidationError',
        data: ['ContentType not found'],
      });
    });

    test('Throws when field is not a uid field', async () => {
      const res = await rq({
        url: `/content-manager/uid/generate`,
        method: 'POST',
        body: {
          contentTypeUID: uid,
          field: 'otherField',
          data: {},
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
        message: 'ValidationError',
        data: {
          field: [expect.stringMatching('must be a valid `uid` attribute')],
        },
      });
    });

    test('Generates a unique field when targetField is empty', async () => {
      const res = await rq({
        url: `/content-manager/uid/generate`,
        method: 'POST',
        body: {
          contentTypeUID: uid,
          field: 'slug',
          data: {},
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBe('uid-model');

      await rq({
        url: `/content-manager/collection-types/${uid}`,
        method: 'POST',
        body: {
          slug: res.body.data,
        },
      });

      const secondRes = await rq({
        url: `/content-manager/uid/generate`,
        method: 'POST',
        body: {
          contentTypeUID: uid,
          field: 'slug',
          data: {},
        },
      });

      expect(secondRes.statusCode).toBe(200);
      expect(secondRes.body.data).toBe('uid-model-1');
    });

    test('Generates a unique field based on targetField', async () => {
      const res = await rq({
        url: `/content-manager/uid/generate`,
        method: 'POST',
        body: {
          contentTypeUID: uid,
          field: 'slug',
          data: {
            title: 'This is a super title',
          },
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBe('this-is-a-super-title');

      await rq({
        url: `/content-manager/collection-types/${uid}`,
        method: 'POST',
        body: {
          slug: res.body.data,
        },
      });

      const secondRes = await rq({
        url: `/content-manager/uid/generate`,
        method: 'POST',
        body: {
          contentTypeUID: uid,
          field: 'slug',
          data: {
            title: 'This is a super title',
          },
        },
      });

      expect(secondRes.statusCode).toBe(200);
      expect(secondRes.body.data).toBe('this-is-a-super-title-1');
    });

    test('Avoids collisions with already generated uids', async () => {
      const res = await rq({
        url: `/content-manager/uid/generate`,
        method: 'POST',
        body: {
          contentTypeUID: uid,
          field: 'slug',
          data: {
            title: 'My title',
          },
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBe('my-title');

      await rq({
        url: `/content-manager/collection-types/${uid}`,
        method: 'POST',
        body: {
          slug: res.body.data,
        },
      });

      const secondRes = await rq({
        url: `/content-manager/uid/generate`,
        method: 'POST',
        body: {
          contentTypeUID: uid,
          field: 'slug',
          data: {
            title: 'My title',
          },
        },
      });

      expect(secondRes.statusCode).toBe(200);
      expect(secondRes.body.data).toBe('my-title-1');

      await rq({
        url: `/content-manager/collection-types/${uid}`,
        method: 'POST',
        body: {
          slug: secondRes.body.data,
        },
      });

      const thridRes = await rq({
        url: `/content-manager/uid/generate`,
        method: 'POST',
        body: {
          contentTypeUID: uid,
          field: 'slug',
          data: {
            title: 'My title 1',
          },
        },
      });

      expect(thridRes.statusCode).toBe(200);
      expect(thridRes.body.data).toBe('my-title-1-1');
    });
  });

  describe('Check UID availability', () => {
    test('Throws if input is not provided', async () => {
      const res = await rq({
        url: `/content-manager/uid/check-availability`,
        method: 'POST',
        body: {},
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
        message: 'ValidationError',
        data: {
          contentTypeUID: expect.arrayContaining([expect.stringMatching('required field')]),
          field: expect.arrayContaining([expect.stringMatching('required field')]),
          value: expect.arrayContaining([expect.stringMatching('required field')]),
        },
      });
    });

    test('Throws on invalid uid value', async () => {
      const res = await rq({
        url: `/content-manager/uid/check-availability`,
        method: 'POST',
        body: {
          contentTypeUID: uid,
          field: 'slug',
          value: 'Invalid UID valuéééé',
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        data: {
          value: expect.arrayContaining([expect.stringMatching('must match')]),
        },
      });
    });

    test('Throws when contentType is not found', async () => {
      const res = await rq({
        url: `/content-manager/uid/check-availability`,
        method: 'POST',
        body: {
          contentTypeUID: 'non-existent',
          field: 'slug',
          value: 'some-slug',
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'ValidationError',
        data: ['ContentType not found'],
      });
    });

    test('Throws when field is not a uid field', async () => {
      const res = await rq({
        url: `/content-manager/uid/check-availability`,
        method: 'POST',
        body: {
          contentTypeUID: uid,
          field: 'otherField',
          value: 'some-slug',
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
        message: 'ValidationError',
        data: {
          field: [expect.stringMatching('must be a valid `uid` attribute')],
        },
      });
    });

    test('Checks availability', async () => {
      const res = await rq({
        url: `/content-manager/uid/check-availability`,
        method: 'POST',
        body: {
          contentTypeUID: uid,
          field: 'slug',
          value: 'some-available-slug',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        isAvailable: true,
        suggestion: null,
      });
    });

    test('Gives a suggestion when not available', async () => {
      // create data
      await rq({
        url: `/content-manager/collection-types/${uid}`,
        method: 'POST',
        body: {
          slug: 'custom-slug',
        },
      });

      const res = await rq({
        url: `/content-manager/uid/check-availability`,
        method: 'POST',
        body: {
          contentTypeUID: uid,
          field: 'slug',
          value: 'custom-slug',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        isAvailable: false,
        suggestion: 'custom-slug-1',
      });
    });
  });
});
