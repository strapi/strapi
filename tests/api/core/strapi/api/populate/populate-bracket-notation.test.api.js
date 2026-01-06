'use strict';

const fs = require('fs');
const path = require('path');

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();

let strapi;
let rq;

const schemas = {
  contentTypes: {
    article: {
      kind: 'collectionType',
      displayName: 'Article',
      singularName: 'article',
      pluralName: 'articles',
      attributes: {
        title: { type: 'string' },
        image: { type: 'media', multiple: false, allowedTypes: ['images'] },
      },
    },
  },
};

describe('Populate with bracket notation', () => {
  beforeAll(async () => {
    await builder.addContentType(schemas.contentTypes.article).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    const imgRes = await rq({
      method: 'POST',
      url: '/upload',
      formData: {
        files: fs.createReadStream(path.join(__dirname, 'rec.jpg')),
      },
    });
    const imageId = imgRes.body[0].id;

    await rq({
      method: 'POST',
      url: '/api/articles',
      body: {
        data: {
          title: 'Test Article',
          image: imageId,
        },
      },
    });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('populate[image]=* should not throw ValidationError', async () => {
    const res = await rq({
      method: 'GET',
      url: '/api/articles?populate[image]=*',
    });

    if (res.status !== 200) {
      console.log('Error response:', JSON.stringify(res.body, null, 2));
    }

    expect(res.status).toBe(200);
    expect(res.body.error).toBeUndefined();
  });
});
