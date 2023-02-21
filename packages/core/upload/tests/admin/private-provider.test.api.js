'use strict';

const fs = require('fs');
const path = require('path');

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

describe('Upload', () => {
  beforeAll(async () => {
    //  Create builder
    await builder.addContentType(dogModel).build();

    // Create api instance
    strapi = await createStrapiInstance({
      bootstrap(strapi) {
        strapi.plugins.upload.provider.isPrivate = () => true;
        strapi.plugins.upload.provider.getSignedUrl = () => ({ url: 'signedUrl' });
      },
    });

    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Create', () => {
    test('Rejects when no files are provided', async () => {
      const res = await rq({ method: 'POST', url: '/upload', formData: {} });
      expect(res.statusCode).toBe(400);
    });

    test('Can upload a file', async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: { files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')) },
      });

      expect(res.statusCode).toBe(200);
    });
  });

  describe('Read', () => {
    test('GET /upload/files => Find files', async () => {
      const res = await rq({ method: 'GET', url: '/upload/files' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        results: expect.arrayContaining([
          expect.objectContaining({
            id: expect.anything(),
            url: expect.any(String),
          }),
        ]),
        pagination: {
          page: expect.any(Number),
          pageSize: expect.any(Number),
          pageCount: expect.any(Number),
          total: expect.any(Number),
        },
      });
      res.body.results.forEach((file) => expect(file.folder).toBeDefined());
    });
  });
});
