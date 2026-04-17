'use strict';

const fs = require('fs');
const path = require('path');

const { createStrapiInstance } = require('api-tests/strapi');
const { createContentAPIRequest } = require('api-tests/request');

let strapi;
let rq;

let isPrivate = true;

const mockProvider = () => ({
  init() {
    return {
      isPrivate() {
        return isPrivate;
      },
      getSignedUrl(file) {
        return { url: `signed:${file.url}` };
      },
      uploadStream(file) {
        file.url = 'test-file.jpg';
      },
      upload(file) {
        file.url = 'test-file.jpg';
      },
      delete() {},
      checkFileSize() {},
    };
  },
});

const uploadFile = (fileName = 'rec.jpg') => {
  return rq({
    method: 'POST',
    url: '/upload',
    formData: {
      files: fs.createReadStream(path.join(__dirname, `../utils/${fileName}`)),
    },
  });
};

describe('Content API upload controller URL signing', () => {
  beforeAll(async () => {
    const localProviderPath = require.resolve('@strapi/provider-upload-local');
    jest.mock(localProviderPath, () => mockProvider());

    strapi = await createStrapiInstance();
    rq = createContentAPIRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  describe('Private provider', () => {
    beforeAll(() => {
      isPrivate = true;
    });

    test('POST /upload returns signed URLs', async () => {
      const res = await uploadFile();

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].url).toMatch(/^signed:/);
      expect(res.body[0].isUrlSigned).toBe(true);
    });

    test('GET /upload/files returns signed URLs', async () => {
      const res = await rq({ method: 'GET', url: '/upload/files' });

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      for (const file of res.body) {
        expect(file.url).toMatch(/^signed:/);
        expect(file.isUrlSigned).toBe(true);
      }
    });

    test('GET /upload/files/:id returns signed URL', async () => {
      const uploadRes = await uploadFile();
      const fileId = uploadRes.body[0].id;

      const res = await rq({ method: 'GET', url: `/upload/files/${fileId}` });

      expect(res.statusCode).toBe(200);
      expect(res.body.url).toMatch(/^signed:/);
      expect(res.body.isUrlSigned).toBe(true);
    });

    test('DELETE /upload/files/:id returns signed URL', async () => {
      const uploadRes = await uploadFile();
      const fileId = uploadRes.body[0].id;

      const res = await rq({ method: 'DELETE', url: `/upload/files/${fileId}` });

      expect(res.statusCode).toBe(200);
      expect(res.body.url).toMatch(/^signed:/);
      expect(res.body.isUrlSigned).toBe(true);
    });
  });

  describe('Public provider', () => {
    beforeAll(() => {
      isPrivate = false;
    });

    test('POST /upload returns unsigned URLs', async () => {
      const res = await uploadFile();

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].url).not.toMatch(/^signed:/);
      expect(res.body[0].isUrlSigned).toBe(false);
    });

    test('GET /upload/files returns unsigned URLs', async () => {
      const res = await rq({ method: 'GET', url: '/upload/files' });

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      for (const file of res.body) {
        expect(file.url).not.toMatch(/^signed:/);
        expect(file.isUrlSigned).toBe(false);
      }
    });

    test('GET /upload/files/:id returns unsigned URL', async () => {
      const uploadRes = await uploadFile();
      const fileId = uploadRes.body[0].id;

      const res = await rq({ method: 'GET', url: `/upload/files/${fileId}` });

      expect(res.statusCode).toBe(200);
      expect(res.body.url).not.toMatch(/^signed:/);
      expect(res.body.isUrlSigned).toBe(false);
    });
  });
});
