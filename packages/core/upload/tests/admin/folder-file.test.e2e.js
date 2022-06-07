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

const createFolder = async (name, parent = null) => {
  const res = await rq({
    method: 'POST',
    url: '/upload/folders',
    body: { name, parent },
  });
  return res.body.data;
};

const createAFile = async (parent = null) => {
  const res = await rq({
    method: 'POST',
    url: '/upload',
    formData: {
      files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
      fileInfo: JSON.stringify({ folder: parent }),
    },
  });
  return res.body[0];
};

describe('Bulk actions for folders & files', () => {
  const builder = createTestBuilder();

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await rq({
      method: 'POST',
      url: '/upload/actions/bulk-delete',
      body: {
        folderIds: data.folders.map(f => f.id),
      },
    });

    await strapi.destroy();
    await builder.cleanup();
  });

  describe('delete', () => {
    test('Can delete folders and files', async () => {
      const folder1 = await createFolder('folder-a-1', null);
      const folder1a = await createFolder('folder-a-1a', folder1.id);
      const folder1b = await createFolder('folder-a-1b', folder1.id);
      const folder1a1 = await createFolder('folder-a-1a1', folder1a.id);
      const file1 = await createAFile(null);
      const file1b = await createAFile(folder1b.id);
      const file1a = await createAFile(folder1a.id);
      const file1a1 = await createAFile(folder1a1.id);

      const res = await rq({
        method: 'POST',
        url: '/upload/actions/bulk-delete',
        body: {
          fileIds: [file1.id],
          folderIds: [folder1a.id],
        },
      });

      expect(res.body.data).toMatchObject({
        files: [
          {
            alternativeText: null,
            caption: null,
            createdAt: expect.anything(),
            ext: '.jpg',
            folderPath: '/',
            formats: null,
            hash: expect.anything(),
            height: 20,
            id: file1.id,
            mime: 'image/jpeg',
            name: 'rec.jpg',
            previewUrl: null,
            provider: 'local',
            provider_metadata: null,
            size: 0.27,
            updatedAt: expect.anything(),
            url: expect.anything(),
            width: 20,
          },
        ],
        folders: [
          {
            id: folder1a.id,
            name: 'folder-a-1a',
            path: expect.anything(),
            pathId: expect.any(Number),
            createdAt: expect.anything(),
            updatedAt: expect.anything(),
          },
        ],
      });

      const resFolder = await rq({
        method: 'GET',
        url: '/upload/folders',
      });

      const existingfoldersIds = resFolder.body.data.map(f => f.id);
      expect(existingfoldersIds).toEqual(expect.not.arrayContaining([folder1a.id, folder1a1.id]));
      expect(existingfoldersIds).toEqual(expect.arrayContaining([folder1.id, folder1b.id]));

      const resFiles = await rq({
        method: 'GET',
        url: '/upload/files',
        qs: {
          pageSize: 100,
        },
      });

      const existingfilesIds = resFiles.body.results.map(f => f.id);
      expect(existingfilesIds).toEqual(
        expect.not.arrayContaining([file1.id, file1a.id, file1a1.id])
      );
      expect(existingfilesIds).toEqual(expect.arrayContaining([file1b.id]));

      data.folders.push(folder1, folder1b);
      data.files.push(file1b);
    });
  });

  describe('move', () => {
    test('Can move folders and files into another folder', async () => {
      const folder1 = await createFolder('folder-b-1', null);
      const folder1a = await createFolder('folder-b-1a', folder1.id);
      const folder1b = await createFolder('folder-b-1b', folder1.id);
      const folder1a1 = await createFolder('folder-b-1a1', folder1a.id);
      const file1 = await createAFile(null);
      const file1a = await createAFile(folder1a.id);
      const file1b = await createAFile(folder1b.id);
      const file1a1 = await createAFile(folder1a1.id);

      const res = await rq({
        method: 'POST',
        url: '/upload/actions/bulk-move',
        body: {
          destinationFolderId: folder1b.id,
          fileIds: [file1a.id],
          folderIds: [folder1a.id],
        },
      });

      console.log('res.body', res.body);

      expect(res.body.data).toMatchObject({
        files: [
          {
            alternativeText: null,
            caption: null,
            createdAt: expect.anything(),
            ext: '.jpg',
            folderPath: folder1b.path,
            formats: null,
            hash: expect.anything(),
            height: 20,
            id: file1a.id,
            mime: 'image/jpeg',
            name: 'rec.jpg',
            previewUrl: null,
            provider: 'local',
            provider_metadata: null,
            size: 0.27,
            updatedAt: expect.anything(),
            url: expect.anything(),
            width: 20,
          },
        ],
        folders: [
          {
            id: folder1a.id,
            name: 'folder-b-1a',
            path: `${folder1b.path}/${folder1a.pathId}`,
            pathId: expect.any(Number),
            createdAt: expect.anything(),
            updatedAt: expect.anything(),
          },
        ],
      });

      const {
        body: { data: folderResults },
      } = await rq({
        method: 'GET',
        url: '/upload/folders',
        qs: {
          populate: 'parent',
          sort: 'id:asc',
          filters: { id: { $in: [folder1.id, folder1a.id, folder1b.id, folder1a1.id] } },
        },
      });

      expect(folderResults[0]).toMatchObject({ ...folder1, parent: null });
      expect(folderResults[1]).toMatchObject({
        ...folder1a,
        path: `${folder1b.path}/${folder1a.pathId}`,
        parent: { id: folder1b.id },
        updatedAt: expect.anything(),
      });
      expect(folderResults[2]).toMatchObject({ ...folder1b, parent: { id: folder1.id } });
      expect(folderResults[3]).toMatchObject({
        ...folder1a1,
        path: `${folder1b.path}/${folder1a.pathId}/${folder1a1.pathId}`,
        parent: { id: folder1a.id },
      });

      const {
        body: { results: fileResults },
      } = await rq({
        method: 'GET',
        url: '/upload/files',
        qs: {
          pageSize: 100,
          populate: 'folder',
          sort: 'id:asc',
          filters: { id: { $in: [file1.id, file1a.id, file1b.id, file1a1.id] } },
        },
      });

      expect(fileResults[0]).toMatchObject({ ...file1, folder: null });
      expect(fileResults[1]).toMatchObject({
        ...file1a,
        folderPath: folder1b.path,
        folder: { id: folder1b.id },
        updatedAt: expect.anything(),
      });
      expect(fileResults[2]).toMatchObject({ ...file1b, folder: { id: folder1b.id } });
      expect(fileResults[3]).toMatchObject({
        ...file1a1,
        folderPath: `${folder1b.path}/${folder1a.pathId}/${folder1a1.pathId}`,
        folder: { id: folder1a1.id },
      });

      data.folders.push(...folderResults);
      data.files.push(...fileResults);
    });
    test('Can move folders and files to the root level', async () => {
      const folder1 = await createFolder('folder-c-1', null);
      const folder1a = await createFolder('folder-c-1a', folder1.id);
      const folder1a1 = await createFolder('folder-c-1a1', folder1a.id);
      const file1 = await createAFile(null);
      const file1a = await createAFile(folder1a.id);
      const file1a1 = await createAFile(folder1a1.id);

      const res = await rq({
        method: 'POST',
        url: '/upload/actions/bulk-move',
        body: {
          destinationFolderId: null,
          fileIds: [file1a.id],
          folderIds: [folder1a.id],
        },
      });

      expect(res.body.data).toMatchObject({
        files: [
          {
            alternativeText: null,
            caption: null,
            createdAt: expect.anything(),
            ext: '.jpg',
            folderPath: '/',
            formats: null,
            hash: expect.anything(),
            height: 20,
            id: file1a.id,
            mime: 'image/jpeg',
            name: 'rec.jpg',
            previewUrl: null,
            provider: 'local',
            provider_metadata: null,
            size: 0.27,
            updatedAt: expect.anything(),
            url: expect.anything(),
            width: 20,
          },
        ],
        folders: [
          {
            id: folder1a.id,
            name: 'folder-c-1a',
            path: `/${folder1a.pathId}`,
            pathId: expect.any(Number),
            createdAt: expect.anything(),
            updatedAt: expect.anything(),
          },
        ],
      });

      const {
        body: { data: folderResults },
      } = await rq({
        method: 'GET',
        url: '/upload/folders?populate=parent',
        qs: {
          populate: 'parent',
          sort: 'id:asc',
          filters: { id: { $in: [folder1.id, folder1a.id, folder1a1.id] } },
        },
      });

      expect(folderResults[0]).toMatchObject({ ...folder1, parent: null });
      expect(folderResults[1]).toMatchObject({
        ...folder1a,
        path: `/${folder1a.pathId}`,
        parent: null,
        updatedAt: expect.anything(),
      });
      expect(folderResults[2]).toMatchObject({
        ...folder1a1,
        path: `/${folder1a.pathId}/${folder1a1.pathId}`,
        parent: { id: folder1a.id },
      });

      const {
        body: { results: fileResults },
      } = await rq({
        method: 'GET',
        url: '/upload/files',
        qs: {
          pageSize: 100,
          populate: 'folder',
          sort: 'id:asc',
          filters: { id: { $in: [file1.id, file1a.id, file1a1.id] } },
        },
      });

      expect(fileResults[0]).toMatchObject({ ...file1, folder: null });
      expect(fileResults[1]).toMatchObject({
        ...file1a,
        folderPath: '/',
        folder: null,
        updatedAt: expect.anything(),
      });
      expect(fileResults[2]).toMatchObject({
        ...file1a1,
        folderPath: `/${folder1a.pathId}/${folder1a1.pathId}`,
        folder: { id: folder1a1.id },
      });

      data.folders.push(...folderResults);
      data.files.push(...fileResults);
    });

    test('Cannot move a folder inside itself (0 level)', async () => {
      const folder1 = await createFolder('folder-d-1', null);
      data.folders.push(folder1);

      const res = await rq({
        method: 'POST',
        url: '/upload/actions/bulk-move',
        body: {
          destinationFolderId: folder1.id,
          folderIds: [folder1.id],
        },
      });
      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe(
        'folders cannot be moved inside themselves or one of its children: folder-d-1'
      );
    });

    test('Cannot move a folder inside itself (1 level)', async () => {
      const folder1 = await createFolder('folder-e-1', null);
      const folder1a = await createFolder('folder-e-1a', folder1.id);
      data.folders.push(folder1, folder1a);

      const res = await rq({
        method: 'POST',
        url: '/upload/actions/bulk-move',
        body: {
          destinationFolderId: folder1a.id,
          folderIds: [folder1.id],
        },
      });
      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe(
        'folders cannot be moved inside themselves or one of its children: folder-e-1'
      );
    });

    test('Cannot move a folder inside itself (2 levels)', async () => {
      const folder1 = await createFolder('folder-f-1', null);
      const folder1a = await createFolder('folder-f-1a', folder1.id);
      const folder1a1 = await createFolder('folder-f-1a1', folder1a.id);
      data.folders.push(folder1, folder1a, folder1a1);

      const res = await rq({
        method: 'POST',
        url: '/upload/actions/bulk-move',
        body: {
          destinationFolderId: folder1a1.id,
          folderIds: [folder1.id],
        },
      });
      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe(
        'folders cannot be moved inside themselves or one of its children: folder-f-1'
      );
    });

    test('Cannot move a folder if it creates a duplicate', async () => {
      const folder1 = await createFolder('folder-g-1', null);
      const folder1a = await createFolder('folder-g-1a', folder1.id);
      const folder2 = await createFolder('folder-g-1a', null);
      data.folders.push(folder1, folder1a, folder2);

      const res = await rq({
        method: 'POST',
        url: '/upload/actions/bulk-move',
        body: {
          destinationFolderId: folder1.id,
          folderIds: [folder2.id],
        },
      });
      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('some folders already exists: folder-g-1a');
    });
  });
});
