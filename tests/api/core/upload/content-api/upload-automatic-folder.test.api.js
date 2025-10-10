'use strict';

const fs = require('fs');
const path = require('path');

// Helpers.
const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createContentAPIRequest, createAuthRequest } = require('api-tests/request');
const { orderBy } = require('lodash/fp');

const builder = createTestBuilder();
const data = {
  dogs: [],
};
let strapi;
let rq;
let rqAdmin;
let uploadFolder;

const dogModel = {
  displayName: 'Dog',
  singularName: 'dog',
  pluralName: 'dogs',
  kind: 'collectionType',
  attributes: {
    pic: {
      type: 'media',
    },
  },
};

describe('Uploads folder', () => {
  beforeAll(async () => {
    await builder.addContentType(dogModel).build();
    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });
    rqAdmin = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    // delete all folders
    const res = await rqAdmin({
      method: 'GET',
      url: '/upload/folders',
    });

    await rqAdmin({
      method: 'POST',
      url: '/upload/actions/bulk-delete',
      body: {
        folderIds: res.body.data.map((f) => f.id),
      },
    });

    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Regular upload', () => {
    test('Uploaded file goes into a specific folder', async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: {
          files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
        },
      });

      expect(res.statusCode).toBe(201);

      const { body: file } = await rqAdmin({
        method: 'GET',
        url: `/upload/files/${res.body[0].id}`,
      });

      expect(file).toMatchObject({
        folder: {
          name: 'API Uploads',
          pathId: expect.any(Number),
        },
        folderPath: `/${file.folder.pathId}`,
      });

      uploadFolder = file.folder;
    });

    test('Uploads folder is recreated if deleted', async () => {
      await rqAdmin({
        method: 'POST',
        url: '/upload/actions/bulk-delete',
        body: {
          folderIds: [uploadFolder.id],
        },
      });

      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: {
          files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
        },
      });

      expect(res.statusCode).toBe(201);

      const { body: file } = await rqAdmin({
        method: 'GET',
        url: `/upload/files/${res.body[0].id}`,
      });

      expect(file).toMatchObject({
        folder: {
          name: 'API Uploads',
          pathId: expect.any(Number),
        },
        folderPath: `/${file.folder.pathId}`,
      });

      uploadFolder = file.folder;
    });

    test('Uploads folder is recreated if deleted (handle duplicates)', async () => {
      await rqAdmin({
        method: 'POST',
        url: '/upload/actions/bulk-delete',
        body: {
          folderIds: [uploadFolder.id],
        },
      });

      await rqAdmin({
        method: 'POST',
        url: '/upload/folders',
        body: {
          name: 'API Uploads',
          parent: null,
        },
      });

      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: {
          files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
        },
      });

      expect(res.statusCode).toBe(201);

      const { body: file } = await rqAdmin({
        method: 'GET',
        url: `/upload/files/${res.body[0].id}`,
      });

      expect(file).toMatchObject({
        folder: {
          name: 'API Uploads (1)',
          pathId: expect.any(Number),
        },
        folderPath: `/${file.folder.pathId}`,
      });

      uploadFolder = file.folder;
    });
  });

  describe('Attach to an entity', () => {
    beforeAll(async () => {
      const res = await rqAdmin({
        url: '/content-manager/collection-types/api::dog.dog',
        method: 'POST',
        body: {
          name: 'dog',
        },
      });
      data.dogs.push(res.body.data);
    });

    test('Uploaded file goes into a specific folder', async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: {
          data: '{}',
          files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
          refId: data.dogs[0].id,
          ref: 'api::dog.dog',
          field: 'pic',
        },
      });

      expect(res.statusCode).toBe(201);

      const { body: file } = await rqAdmin({
        method: 'GET',
        url: `/upload/files/${res.body[0].id}`,
      });

      expect(file).toMatchObject({
        folder: {
          name: 'API Uploads (1)',
          pathId: expect.any(Number),
        },
        folderPath: `/${file.folder.pathId}`,
      });

      uploadFolder = file.folder;
    });

    test('Uploads folder is recreated if deleted', async () => {
      await rqAdmin({
        method: 'POST',
        url: '/upload/actions/bulk-delete',
        body: {
          folderIds: [uploadFolder.id],
        },
      });

      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: {
          data: '{}',
          files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
          refId: data.dogs[0].id,
          ref: 'api::dog.dog',
          field: 'pic',
        },
      });

      expect(res.statusCode).toBe(201);

      const { body: file } = await rqAdmin({
        method: 'GET',
        url: `/upload/files/${res.body[0].id}`,
      });

      expect(file).toMatchObject({
        folder: {
          name: 'API Uploads (1)',
          pathId: expect.any(Number),
        },
        folderPath: `/${file.folder.pathId}`,
      });

      uploadFolder = file.folder;
    });

    test('Uploads folder is recreated if deleted (handle duplicates)', async () => {
      await rqAdmin({
        method: 'POST',
        url: '/upload/actions/bulk-delete',
        body: {
          folderIds: [uploadFolder.documentId],
        },
      });

      await rqAdmin({
        method: 'POST',
        url: '/upload/folders',
        body: {
          name: 'API Uploads (1)',
          parent: null,
        },
      });

      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: {
          files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
          refId: data.dogs[0].id,
          ref: 'api::dog.dog',
          field: 'pic',
        },
      });

      expect(res.statusCode).toBe(201);

      const { body: file } = await rqAdmin({
        method: 'GET',
        url: `/upload/files/${res.body[0].id}`,
      });

      expect(file).toMatchObject({
        folder: {
          name: 'API Uploads (1)',
          pathId: expect.any(Number),
        },
        folderPath: `/${file.folder.pathId}`,
      });

      uploadFolder = file.folder;
    });
  });

  describe('Upload with multiple files', () => {
    test('Uploaded files go into a specific folder', async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: {
          files: [
            fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
            fs.createReadStream(path.join(__dirname, '../utils/strapi.jpg')),
          ],
        },
      });

      expect(res.statusCode).toBe(201);

      const {
        body: { results: files },
      } = await rqAdmin({
        method: 'GET',
        url: '/upload/files',
        qs: {
          filters: {
            id: {
              $in: res.body.map(({ id }) => id),
            },
          },
          populate: '*',
        },
      });

      files.forEach((file) =>
        expect(file).toMatchObject({
          folder: {
            // name string with format API Uploads (n)
            name: expect.stringMatching(/^API Uploads \(\d+\)$/),
            pathId: expect.any(Number),
          },
          folderPath: `/${file.folder.pathId}`,
        })
      );

      expect(files.every((file) => file.folder.id === files[0].folder.id)).toBe(true);

      uploadFolder = files[0].folder;
    });

    test('Uploaded files with fileInfo', async () => {
      const fileInfo = orderBy(
        'name',
        'asc'
      )([
        {
          name: 'file1',
          alternativeText: 'file1',
          caption: 'file1',
        },
        {
          name: 'file2',
          alternativeText: 'file2',
          caption: 'file2',
        },
      ]);

      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: {
          files: [
            fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
            fs.createReadStream(path.join(__dirname, '../utils/strapi.jpg')),
          ],
          fileInfo: fileInfo.map(JSON.stringify),
        },
      });

      expect(res.statusCode).toBe(201);

      const {
        body: { results: files },
      } = await rqAdmin({
        method: 'GET',
        url: '/upload/files',
        qs: {
          filters: {
            id: {
              $in: res.body.map(({ id }) => id),
            },
          },
          populate: '*',
          // sort the same as fileInfo so that the loop below matches regardless of order
          sort: ['name:asc'],
        },
      });

      files.forEach((file, index) =>
        expect(file).toMatchObject({
          ...fileInfo[index],
          folder: {
            name: expect.stringMatching(/^API Uploads \(\d+\)$/),
            pathId: expect.any(Number),
          },
          folderPath: `/${file.folder.pathId}`,
        })
      );

      expect(files.every((file) => file.folder.id === files[0].folder.id)).toBe(true);

      uploadFolder = files[0].folder;
    });

    test('Uploads folder is recreated if deleted', async () => {
      await rqAdmin({
        method: 'POST',
        url: '/upload/actions/bulk-delete',
        body: {
          folderIds: [uploadFolder.id],
        },
      });

      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: {
          files: [
            fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
            fs.createReadStream(path.join(__dirname, '../utils/strapi.jpg')),
          ],
        },
      });

      expect(res.statusCode).toBe(201);

      const {
        body: { results: files },
      } = await rqAdmin({
        method: 'GET',
        url: '/upload/files',
        qs: {
          filters: {
            id: {
              $in: res.body.map(({ id }) => id),
            },
          },
          populate: '*',
        },
      });

      files.forEach((file) => {
        expect(file).toMatchObject({
          folder: {
            name: expect.stringMatching(/^API Uploads \(\d+\)$/),
            pathId: expect.any(Number),
          },
          folderPath: `/${file.folder.pathId}`,
        });
      });

      expect(files.every((file) => file.folder.id === files[0].folder.id)).toBe(true);

      uploadFolder = files[0].folder;
    });

    test('Uploads folder is recreated if deleted (handle duplicates)', async () => {
      await rqAdmin({
        method: 'POST',
        url: '/upload/actions/bulk-delete',
        body: {
          folderIds: [uploadFolder.id],
        },
      });

      await rqAdmin({
        method: 'POST',
        url: '/upload/folders',
        body: {
          name: 'API Uploads (3)',
          parent: null,
        },
      });

      const res = await rq({
        method: 'POST',
        url: '/upload',
        formData: {
          files: [
            fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
            fs.createReadStream(path.join(__dirname, '../utils/strapi.jpg')),
          ],
        },
      });

      expect(res.statusCode).toBe(201);

      const {
        body: { results: files },
      } = await rqAdmin({
        method: 'GET',
        url: '/upload/files',
        qs: {
          filters: {
            id: {
              $in: res.body.map(({ id }) => id),
            },
          },
          populate: '*',
        },
      });

      files.forEach((file) => {
        expect(file).toMatchObject({
          folder: {
            name: expect.stringMatching(/^API Uploads \(\d+\)$/),
            pathId: expect.any(Number),
          },
          folderPath: `/${file.folder.pathId}`,
        });
      });

      expect(files.every((file) => file.folder.id === files[0].folder.id)).toBe(true);

      uploadFolder = files[0].folder;
    });
  });
});
