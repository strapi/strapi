'use strict';

const fs = require('fs');
const path = require('path');

const { createTestBuilder } = require('../../../../../../test/helpers/builder');
const { createStrapiInstance } = require('../../../../../../test/helpers/strapi');
const {
  createContentAPIRequest,
  createAuthRequest,
} = require('../../../../../../test/helpers/request');

const builder = createTestBuilder();

let strapi;
let rq;

const schemas = {
  contentTypes: {
    a: {
      kind: 'collectionType',
      displayName: 'a',
      singularName: 'a',
      pluralName: 'as',
      attributes: {
        cover: { type: 'media' },
      },
    },
  },
};

const getFixtures = file => {
  return [
    {
      cover: file.id,
    },
  ];
};

const uploadFile = async () => {
  const strapi = await createStrapiInstance();
  const rq = await createAuthRequest({ strapi });

  const res = await rq({
    method: 'POST',
    url: '/upload',
    formData: {
      files: fs.createReadStream(path.join(__dirname, 'rec.jpg')),
    },
  });

  await strapi.destroy();

  return res.body[0];
};

describe('Sanitize populated entries', () => {
  beforeAll(async () => {
    const file = await uploadFile();

    await builder
      .addContentTypes(Object.values(schemas.contentTypes))
      .addFixtures(schemas.contentTypes.a.singularName, getFixtures(file))
      .build();

    strapi = await createStrapiInstance();
    rq = createContentAPIRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Populate simple media', () => {
    test('Media can be populated without restricted attributes', async () => {
      const { status, body } = await rq.get(`/${schemas.contentTypes.a.pluralName}`, {
        qs: {
          populate: {
            cover: {
              populate: '*',
            },
          },
        },
      });

      expect(status).toBe(200);
      expect(body.data[0].attributes.cover).toBeDefined();
      expect(body.data[0].attributes.cover.data.attributes.createdBy).toBeUndefined();
      expect(body.data[0].attributes.cover.data.attributes.updatedBy).toBeUndefined();
    });
  });
});
