'use strict';

const fs = require('fs');

// Helpers.
const { registerAndLogin } = require('../../../test/helpers/auth');
const { createAuthRequest } = require('../../../test/helpers/request');

let rq;

describe('Upload plugin end to end tests', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);
  }, 60000);

  describe('GET /upload/settings => Get settings for an environment', () => {
    test('Returns the settings', async () => {
      const res = await rq.get('/upload/settings');

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        data: {
          sizeOptimization: true,
          videoPreview: true,
          responsiveDimensions: true,
        },
      });
    });
  });

  describe('PUT /upload/settings/:environment', () => {
    test('Updates an envrionment config correctly', async () => {
      const updateRes = await rq.put('/upload/settings', {
        body: {
          sizeOptimization: true,
          videoPreview: false,
          responsiveDimensions: true,
        },
      });

      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body).toEqual({
        data: {
          sizeOptimization: true,
          videoPreview: false,
          responsiveDimensions: true,
        },
      });

      const getRes = await rq.get('/upload/settings');

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body).toEqual({
        data: {
          sizeOptimization: true,
          videoPreview: false,
          responsiveDimensions: true,
        },
      });
    });
  });

  describe('POST /upload => Upload a file', () => {
    test('Simple image upload', async () => {
      const res = await rq.post('/upload', {
        formData: {
          files: fs.createReadStream(__dirname + '/rec.jpg'),
        },
      });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0]).toEqual(
        expect.objectContaining({
          id: expect.anything(),
          sha256: expect.any(String),
          hash: expect.any(String),
          size: expect.any(Number),
          url: expect.any(String),
          provider: 'local',
          name: 'rec.jpg',
          ext: '.jpg',
          mime: 'image/jpeg',
        })
      );
    });

    test('Rejects when no files are provided', async () => {
      const res = await rq.post('/upload', {
        formData: {},
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /upload/files => Find files', () => {});
  describe('GET /upload/files/count => Count available files', () => {});
  describe('GET /upload/files/:id => Find one file', () => {});
  describe('GET /upload/search/:id => Search files', () => {});
  describe('DELETE /upload/files/:id => Delete a file ', () => {});
});
