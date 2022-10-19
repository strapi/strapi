'use strict';

const { createStrapiInstance } = require('../../../../../test/helpers/strapi');
const { createTestBuilder } = require('../../../../../test/helpers/builder');
const { createContentAPIRequest } = require('../../../../../test/helpers/request');

const builder = createTestBuilder();
let strapi;
let rq;

const productWithMedia = {
  attributes: {
    name: {
      type: 'string',
    },
    description: {
      type: 'text',
    },
    media: {
      type: 'media',
      multiple: false,
      required: true,
      allowedTypes: ['images', 'files', 'videos', 'audios'],
    },
    multipleMedia: {
      type: 'media',
      multiple: true,
      required: true,
      allowedTypes: ['images', 'files', 'videos', 'audios'],
    },
  },
  displayName: 'product-with-media',
  singularName: 'product-with-media',
  pluralName: 'product-with-medias',
  description: '',
  collectionName: '',
};

describe('Core API - Basic + required media', () => {
  beforeAll(async () => {
    await builder.addContentType(productWithMedia).build();

    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Create entry without required multiple media', async () => {
    const product = {
      name: 'product',
      description: 'description',
      media: 1,
    };

    const res = await rq({
      method: 'POST',
      url: '/product-with-medias',
      body: { data: product },
      qs: { populate: true },
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      data: null,
      error: {
        status: 400,
        name: 'ValidationError',
        message: 'multipleMedia must be defined.',
        details: {
          errors: [
            {
              path: ['multipleMedia'],
              message: 'multipleMedia must be defined.',
              name: 'ValidationError',
            },
          ],
        },
      },
    });
  });

  test('Create entry without required single media', async () => {
    const product = {
      name: 'product',
      description: 'description',
      multipleMedia: [{ id: 1 }],
    };

    const res = await rq({
      method: 'POST',
      url: '/product-with-medias',
      body: { data: product },
      qs: { populate: true },
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      data: null,
      error: {
        status: 400,
        name: 'ValidationError',
        message: 'media must be defined.',
        details: {
          errors: [
            {
              path: ['media'],
              message: 'media must be defined.',
              name: 'ValidationError',
            },
          ],
        },
      },
    });
  });
});
