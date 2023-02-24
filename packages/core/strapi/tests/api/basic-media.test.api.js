'use strict';

const fs = require('fs');
const path = require('path');
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
  let file;

  beforeAll(async () => {
    await builder.addContentType(productWithMedia).build();
    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });

    // Create file
    const result = await rq({
      method: 'POST',
      url: '/upload',
      formData: {
        files: fs.createReadStream(path.join(__dirname, 'basic-media.test.api.js')),
      },
    });
    file = result.body[0];
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Create entry without required multiple media', async () => {
    const product = {
      name: 'product',
      description: 'description',
      media: file.id,
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

  test('Create entry with required multiple media as an empty array', async () => {
    const product = {
      name: 'product',
      description: 'description',
      multipleMedia: [],
      media: file.id,
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
        message: 'multipleMedia field must have at least 1 items',
        details: {
          errors: [
            {
              path: ['multipleMedia'],
              message: 'multipleMedia field must have at least 1 items',
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
      multipleMedia: [{ id: file.id }],
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
