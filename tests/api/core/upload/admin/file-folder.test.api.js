'use strict';

const fs = require('fs');
const path = require('path');

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

let strapi;
let rq;
const data = {
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
        body: { name: `my folder ${i}` },
      });
      data.folders.push(folderRes.body.data);
    }
  });

  afterAll(async () => {
    await rq({
      method: 'POST',
      url: '/upload/actions/bulk-delete',
      body: {
        folderIds: data.folders.map((f) => f.id),
      },
    });

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

      expect(res.statusCode).toBe(201);
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
        folder: null,
        folderPath: '/',
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

      expect(res.statusCode).toBe(201);
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
        folder: { id: data.folders[0].id },
        folderPath: data.folders[0].path,
      });

      data.files.push(file);
    });

    test("Cannot create a file inside a folder that doesn't exist", async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: {
          files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
          fileInfo: JSON.stringify({
            folder: '1234', // id that doesn't exist
          }),
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('the folder does not exist');
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
          folder: { id: data.folders[1].id },
          folderPath: data.folders[1].path,
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
          folder: { id: data.folders[0].id },
          folderPath: data.folders[0].path,
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
          folder: { id: data.folders[0].id },
          folderPath: data.folders[0].path,
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
          folder: { id: data.folders[1].id },
          folderPath: data.folders[1].path,
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
          folder: null,
          folderPath: '/',
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
          folder: null,
          folderPath: '/',
        });
        data.files[1] = file;
      });
    });

    describe("Cannot create a file inside a folder that doesn't exist", () => {
      test('when replacing the file', async () => {
        const res = await rq({
          method: 'POST',
          url: `/upload?id=${data.files[1].id}`,
          formData: {
            files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
            fileInfo: JSON.stringify({
              folder: '1234', // id that doesn't exist
            }),
          },
        });

        expect(res.status).toBe(400);
        expect(res.body.error.message).toBe('the folder does not exist');
      });

      test('whithout replacing the file', async () => {
        const res = await rq({
          method: 'POST',
          url: `/upload?id=${data.files[1].id}`,
          formData: {
            fileInfo: JSON.stringify({
              folder: '1234', // id that does not exist
            }),
          },
        });

        expect(res.status).toBe(400);
        expect(res.body.error.message).toBe('the folder does not exist');
      });
    });
  });
});
