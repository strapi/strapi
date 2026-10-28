'use strict';

const fs = require('fs');
const path = require('path');

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

describe('Upload', () => {
  beforeAll(async () => {
    await builder.addContentType(dogModel).build();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('POST /upload => Upload a file', () => {
    test('Simple image upload', async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: {
          files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
        },
      });

      expect(res.statusCode).toBe(201);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0]).toEqual(
        expect.objectContaining({
          id: expect.anything(),
          name: 'rec.jpg',
          ext: '.jpg',
          mime: 'image/jpeg',
          hash: expect.any(String),
          size: expect.any(Number),
          width: expect.any(Number),
          height: expect.any(Number),
          url: expect.any(String),
          provider: 'local',
        })
      );
    });

    test('Generates a thumbnail on large enough files', async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: {
          files: fs.createReadStream(path.join(__dirname, '../utils/thumbnail_target.png')),
        },
      });

      expect(res.statusCode).toBe(201);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0]).toEqual(
        expect.objectContaining({
          id: expect.anything(),
          name: 'thumbnail_target.png',
          ext: '.png',
          mime: 'image/png',
          hash: expect.any(String),
          size: expect.any(Number),
          width: expect.any(Number),
          height: expect.any(Number),
          url: expect.any(String),
          provider: 'local',
          formats: {
            thumbnail: {
              name: 'thumbnail_thumbnail_target.png',
              hash: expect.any(String),
              ext: '.png',
              mime: 'image/png',
              size: expect.any(Number),
              sizeInBytes: expect.any(Number),
              width: expect.any(Number),
              height: expect.any(Number),
              url: expect.any(String),
              path: null,
            },
          },
        })
      );
    });
  });

  describe('POST /upload?id=<id> => Replace a file', () => {
    const uploadFile = async (fileName) => {
      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: {
          files: fs.createReadStream(path.join(__dirname, `../utils/${fileName}`)),
        },
      });

      expect(res.statusCode).toBe(201);

      return res.body[0];
    };

    const replaceFile = async (id, fileName) => {
      const res = await rq({
        method: 'POST',
        url: `/upload?id=${id}`,
        formData: {
          files: fs.createReadStream(path.join(__dirname, `../utils/${fileName}`)),
        },
      });

      expect(res.statusCode).toBe(200);

      return res.body;
    };

    const getFile = async (id) => {
      const res = await rq({ method: 'GET', url: `/upload/files/${id}` });

      expect(res.statusCode).toBe(200);

      return res.body;
    };

    test('Replacing an image with a non-image clears the image dimensions and formats', async () => {
      const image = await uploadFile('thumbnail_target.png');

      expect(image.width).toEqual(expect.any(Number));
      expect(image.height).toEqual(expect.any(Number));
      expect(image.formats).toEqual({ thumbnail: expect.any(Object) });

      const replaced = await replaceFile(image.id, 'rec.txt');

      expect(replaced).toMatchObject({
        mime: 'text/plain',
        width: null,
        height: null,
        formats: null,
      });
      expect(await getFile(image.id)).toMatchObject({
        mime: 'text/plain',
        width: null,
        height: null,
        formats: null,
      });
    });

    test('Replacing a non-image with an image sets the image dimensions and formats', async () => {
      const document = await uploadFile('rec.txt');

      expect(document).toMatchObject({ width: null, height: null, formats: null });

      const replaced = await replaceFile(document.id, 'thumbnail_target.png');

      expect(replaced).toMatchObject({
        mime: 'image/png',
        width: expect.any(Number),
        height: expect.any(Number),
        formats: { thumbnail: expect.any(Object) },
      });
      expect(await getFile(document.id)).toMatchObject({
        mime: 'image/png',
        width: replaced.width,
        height: replaced.height,
        formats: { thumbnail: expect.any(Object) },
      });
    });
  });
});
