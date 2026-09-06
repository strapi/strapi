'use strict';

// Helpers.
const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;

const dogModel = {
  displayName: 'Dog',
  singularName: 'dog',
  pluralName: 'dogs',
  kind: 'collectionType',
  attributes: {
    profilePicture: {
      type: 'media',
    },
  },
};

describe('Settings', () => {
  beforeAll(async () => {
    await builder.addContentType(dogModel).build();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('GET /upload/settings => Get settings for an environment', () => {
    test('Returns the settings', async () => {
      const res = await rq({ method: 'GET', url: '/upload/settings' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        data: {
          autoOrientation: false,
          sizeOptimization: true,
          responsiveDimensions: true,
          aiMetadata: true,
          // Read-only echo of the app config, defaulting to 1 (sequential).
          concurrentUploadRequests: 1,
        },
      });
    });
  });

  describe('PUT /upload/settings/:environment', () => {
    test('Updates an environment config correctly', async () => {
      const updateRes = await rq({
        method: 'PUT',
        url: '/upload/settings',
        body: {
          sizeOptimization: true,
          responsiveDimensions: true,
        },
      });

      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body).toEqual({
        data: {
          sizeOptimization: true,
          responsiveDimensions: true,
        },
      });

      const getRes = await rq({ method: 'GET', url: '/upload/settings' });

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body).toEqual({
        data: {
          sizeOptimization: true,
          responsiveDimensions: true,
          // Read-only echo of the app config, appended to every GET response.
          concurrentUploadRequests: 1,
        },
      });
    });

    test('strips the read-only concurrentUploadRequests echo from a PUT instead of persisting it', async () => {
      // The legacy Settings page seeds its form from GET (which now echoes
      // concurrentUploadRequests) and PUTs the whole payload back. That echo
      // must never be written to the store.
      const updateRes = await rq({
        method: 'PUT',
        url: '/upload/settings',
        body: {
          sizeOptimization: true,
          responsiveDimensions: true,
          concurrentUploadRequests: 4,
        },
      });

      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body.data).not.toHaveProperty('concurrentUploadRequests');

      const getRes = await rq({ method: 'GET', url: '/upload/settings' });

      // GET still echoes the config value (1), not the 4 that was PUT — proving
      // it was stripped, not persisted.
      expect(getRes.body.data.concurrentUploadRequests).toBe(1);
    });
  });
});
