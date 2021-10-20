'use strict';

const fs = require('fs');
const path = require('path');

// Helpers.
const { createStrapiInstance } = require('../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../test/helpers/request');

let strapi;
let rq;

describe('Upload plugin end to end tests', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  describe('GET /upload/settings => Get settings for an environment', () => {
    test('Returns the settings', async () => {
      const res = await rq({ method: 'GET', url: '/upload/settings' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        data: {
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

  describe('POST /upload => Upload a file', () => {
    test('Simple image upload', async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: {
          files: fs.createReadStream(path.join(__dirname, 'rec.jpg')),
        },
      });

      expect(res.statusCode).toBe(200);
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

    test('Rejects when no files are provided', async () => {
      const res = await rq({ method: 'POST', url: '/upload', formData: {} });
      expect(res.statusCode).toBe(400);
    });

    test('Generates a thumbnail on large enough files', async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: {
          files: fs.createReadStream(path.join(__dirname, 'thumbnail_target.png')),
        },
      });

      expect(res.statusCode).toBe(200);
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

  describe('GET /upload/files => Find files', () => {});
  describe('GET /upload/files/count => Count available files', () => {});
  describe('GET /upload/files/:id => Find one file', () => {});
  describe('GET /upload/search/:id => Search files', () => {});
  describe('DELETE /upload/files/:id => Delete a file ', () => {});
});
