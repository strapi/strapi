'use strict';

const fs = require('fs');
const path = require('path');

const { createTestBuilder } = require('../../../../../test/helpers/builder');
const { createStrapiInstance } = require('../../../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../../../test/helpers/request');

let strapi;
let rq;
let data = {
  folders: [],
  files: [],
};

describe('File', () => {
  const builder = createTestBuilder();

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    // create 2 folders
    for (let i = 1; i <= 2; i += 1) {
      const folderRes = await rq({
        method: 'POST',
        url: '/upload/folders',
        body: { name: `folder ${i}` },
      });
      data.folders.push(folderRes.body.data);
    }
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('create', () => {
    test('Can create a file at root level', async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: {
          files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
        },
      });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);

      const { body: file } = await rq({
        method: 'GET',
        url: `/upload/files/${res.body[0].id}`,
      });

      expect(file).toMatchObject({
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
        path: '/rec.jpg',
        folder: null,
      });

      data.files.push(file);
    });

    test('Can create a file inside a folder', async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: {
          files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
          fileInfo: JSON.stringify({
            folder: data.folders[0].id,
          }),
        },
      });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);

      const { body: file } = await rq({
        method: 'GET',
        url: `/upload/files/${res.body[0].id}`,
      });

      expect(file).toMatchObject({
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
        path: '/folder 1/rec.jpg',
        folder: { id: 1 },
      });

      data.files.push(file);
    });
  });

  describe('Update info', () => {
    describe('Move a file from a folder to another folder', () => {
      test('when replacing the file', async () => {
        const res = await rq({
          method: 'POST',
          url: `/upload?id=${data.files[1].id}`,
          formData: {
            files: fs.createReadStream(path.join(__dirname, '../utils/rec.pdf')),
            fileInfo: JSON.stringify({ folder: data.folders[1].id }),
          },
        });

        expect(res.statusCode).toBe(200);
        expect(res.body).toMatchObject({ id: data.files[1].id });

        const { body: file } = await rq({
          method: 'GET',
          url: `/upload/files/${res.body.id}`,
        });

        expect(file).toMatchObject({
          id: expect.anything(),
          name: 'rec.pdf',
          ext: '.jpg',
          mime: 'application/pdf',
          hash: expect.any(String),
          size: expect.any(Number),
          width: expect.any(Number),
          height: expect.any(Number),
          url: expect.any(String),
          provider: 'local',
          path: '/folder 2/rec.pdf',
          folder: { id: data.folders[1].id },
        });
        data.files[1] = file;
      });

      test('without replacing the file', async () => {
        const res = await rq({
          method: 'POST',
          url: `/upload?id=${data.files[1].id}`,
          formData: {
            fileInfo: JSON.stringify({ folder: data.folders[0].id }),
          },
        });

        expect(res.statusCode).toBe(200);
        expect(res.body).toMatchObject({ id: data.files[1].id });

        const { body: file } = await rq({
          method: 'GET',
          url: `/upload/files/${res.body.id}`,
        });

        expect(file).toMatchObject({
          id: expect.anything(),
          name: 'rec.pdf',
          ext: '.jpg',
          mime: 'application/pdf',
          hash: expect.any(String),
          size: expect.any(Number),
          width: expect.any(Number),
          height: expect.any(Number),
          url: expect.any(String),
          provider: 'local',
          path: '/folder 1/rec.pdf',
          folder: { id: data.folders[0].id },
        });
        data.files[1] = file;
      });
    });
    describe('Move a file from root level to a folder', () => {
      test('when replacing the file', async () => {
        const res = await rq({
          method: 'POST',
          url: `/upload?id=${data.files[0].id}`,
          formData: {
            files: fs.createReadStream(path.join(__dirname, '../utils/rec.pdf')),
            fileInfo: JSON.stringify({ folder: data.folders[0].id }),
          },
        });

        expect(res.statusCode).toBe(200);
        expect(res.body).toMatchObject({ id: data.files[0].id });

        const { body: file } = await rq({
          method: 'GET',
          url: `/upload/files/${res.body.id}`,
        });

        expect(file).toMatchObject({
          id: expect.anything(),
          name: 'rec.pdf',
          ext: '.jpg',
          mime: 'application/pdf',
          hash: expect.any(String),
          size: expect.any(Number),
          width: expect.any(Number),
          height: expect.any(Number),
          url: expect.any(String),
          provider: 'local',
          path: '/folder 1/rec.pdf',
          folder: { id: data.folders[0].id },
        });
        data.files[0] = file;
      });

      test('without replacing the file', async () => {
        const res = await rq({
          method: 'POST',
          url: `/upload?id=${data.files[1].id}`,
          formData: {
            fileInfo: JSON.stringify({ folder: data.folders[1].id }),
          },
        });

        expect(res.statusCode).toBe(200);
        expect(res.body).toMatchObject({ id: data.files[1].id });

        const { body: file } = await rq({
          method: 'GET',
          url: `/upload/files/${res.body.id}`,
        });

        expect(file).toMatchObject({
          id: expect.anything(),
          name: 'rec.pdf',
          ext: '.jpg',
          mime: 'application/pdf',
          hash: expect.any(String),
          size: expect.any(Number),
          width: expect.any(Number),
          height: expect.any(Number),
          url: expect.any(String),
          provider: 'local',
          path: '/folder 2/rec.pdf',
          folder: { id: data.folders[1].id },
        });
        data.files[1] = file;
      });
    });

    describe('Move a file from folder to the root level', () => {
      test('when replacing the file', async () => {
        const res = await rq({
          method: 'POST',
          url: `/upload?id=${data.files[0].id}`,
          formData: {
            files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
            fileInfo: JSON.stringify({ folder: null }),
          },
        });

        expect(res.statusCode).toBe(200);
        expect(res.body).toMatchObject({ id: data.files[0].id });

        const { body: file } = await rq({
          method: 'GET',
          url: `/upload/files/${res.body.id}`,
        });

        expect(file).toMatchObject({
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
          path: '/rec.jpg',
          folder: null,
        });
        data.files[0] = file;
      });

      test('without replacing the file', async () => {
        const res = await rq({
          method: 'POST',
          url: `/upload?id=${data.files[1].id}`,
          formData: {
            fileInfo: JSON.stringify({ folder: null }),
          },
        });

        expect(res.statusCode).toBe(200);
        expect(res.body).toMatchObject({ id: data.files[1].id });

        const { body: file } = await rq({
          method: 'GET',
          url: `/upload/files/${res.body.id}`,
        });

        expect(file).toMatchObject({
          id: expect.anything(),
          name: 'rec.pdf',
          ext: '.jpg',
          mime: 'application/pdf',
          hash: expect.any(String),
          size: expect.any(Number),
          width: expect.any(Number),
          height: expect.any(Number),
          url: expect.any(String),
          provider: 'local',
          path: '/rec.pdf',
          folder: null,
        });
        data.files[1] = file;
      });
    });
  });
});
