'use strict';

const fs = require('fs');
const path = require('path');

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest, createContentAPIRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;
let contentAPIRq;

const smallFile = () => fs.createReadStream(path.join(__dirname, '../utils/rec.jpg'));
const largeFile = () => fs.createReadStream(path.join(__dirname, '../utils/strapi.png'));

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
    await builder.addContentType(dogModel).build();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
    contentAPIRq = await createContentAPIRequest({ strapi });

    strapi.config.set('plugin::upload.sizeLimit', 1000);
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Create', () => {
    test('Rejects when file is bigger than the size limit', async () => {
      // Upload file bigger than 1kb
      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: { files: largeFile() },
      });
      expect(res.statusCode).toBe(413);
    });

    test('Can upload a file smaller than the size Limit', async () => {
      // Upload file smaller than 1kb
      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: { files: smallFile() },
      });

      expect(res.statusCode).toBe(201);
    });
  });

  describe('Replace', () => {
    // Every replace entry point funnels through uploadService.replace(), which used
    // to skip the size check entirely — only the create paths were guarded.
    let fileId;

    beforeEach(async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: { files: smallFile() },
      });

      expect(res.statusCode).toBe(201);
      fileId = res.body[0].id;
    });

    describe('POST /upload/files/:id/replace', () => {
      test('Rejects when the replacement file is bigger than the size limit', async () => {
        const res = await rq({
          method: 'POST',
          url: `/upload/files/${fileId}/replace`,
          formData: { files: largeFile() },
        });

        expect(res.statusCode).toBe(413);
      });

      test('Can replace with a file smaller than the size limit', async () => {
        const res = await rq({
          method: 'POST',
          url: `/upload/files/${fileId}/replace`,
          formData: { files: smallFile() },
        });

        expect(res.statusCode).toBe(200);
      });
    });

    describe('POST /upload?id=<id>', () => {
      test('Rejects when the replacement file is bigger than the size limit', async () => {
        const res = await rq({
          method: 'POST',
          url: `/upload?id=${fileId}`,
          formData: { files: largeFile() },
        });

        expect(res.statusCode).toBe(413);
      });

      test('Can replace with a file smaller than the size limit', async () => {
        const res = await rq({
          method: 'POST',
          url: `/upload?id=${fileId}`,
          formData: { files: smallFile() },
        });

        expect(res.statusCode).toBe(200);
      });
    });

    describe('POST /api/upload?id=<id> (content API)', () => {
      test('Rejects when the replacement file is bigger than the size limit', async () => {
        const res = await contentAPIRq({
          method: 'POST',
          url: `/upload?id=${fileId}`,
          formData: { files: largeFile() },
        });

        expect(res.statusCode).toBe(413);
      });

      test('Can replace with a file smaller than the size limit', async () => {
        const res = await contentAPIRq({
          method: 'POST',
          url: `/upload?id=${fileId}`,
          formData: { files: smallFile() },
        });

        expect(res.statusCode).toBe(200);
      });
    });
  });
});
