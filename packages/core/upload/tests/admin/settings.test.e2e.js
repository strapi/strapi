'use strict';

// Helpers.
const { createTestBuilder } = require('../../../../../test/helpers/builder');
const { createStrapiInstance } = require('../../../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../../../test/helpers/request');

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
        },
      });
    });
  });
});
