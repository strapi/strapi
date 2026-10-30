'use strict';

const fs = require('fs');
const path = require('path');

const { pick } = require('lodash');

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

let strapi;
let rq;
const data = {
  folders: [],
};

const rootPathRegex = /^\/[0-9]*$/i;
const getFolderPathRegex = (pathId) => new RegExp(`^/${pathId}/[0-9]*$`, 'i');

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

describe('Folder', () => {
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
        folderIds: data.folders.map((f) => f.id),
      },
    });

    await strapi.destroy();
    await builder.cleanup();
  });

  describe('create', () => {
    test('Can create a folder at root level', async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload/folders',
        body: {
          name: 'folder 1',
          parent: null,
        },
      });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        id: expect.anything(),
        name: 'folder 1',
        pathId: expect.any(Number),
        path: expect.stringMatching(rootPathRegex),
        createdAt: expect.anything(),
        updatedAt: expect.anything(),
      });
      expect(res.body.data.pathId.toString()).toBe(res.body.data.path.split('/').pop());

      data.folders.push(res.body.data);
    });

    test('Can create a folder inside another folder', async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload/folders',
        body: {
          name: 'folder-2',
          parent: data.folders[0].id,
        },
      });

      expect(res.body.data).toMatchObject({
        id: expect.anything(),
        name: 'folder-2',
        pathId: expect.any(Number),
        path: expect.stringMatching(getFolderPathRegex(data.folders[0].pathId)),
        createdAt: expect.anything(),
        updatedAt: expect.anything(),
      });
      expect(res.body.data.pathId.toString()).toBe(res.body.data.path.split('/').pop());

      data.folders.push(res.body.data);
    });

    test('Cannot create a folder with duplicated name at root level', async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload/folders',
        body: {
          name: 'folder 1',
          parent: null,
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('A folder with this name already exists');
    });

    test('Cannot create a folder with duplicated name inside a folder', async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload/folders',
        body: {
          name: 'folder-2',
          parent: data.folders[0].id,
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('A folder with this name already exists');
    });

    test('Cannot create a folder inside a folder that does not exist', async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload/folders',
        body: {
          name: 'folder-3',
          parent: 99999,
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('parent folder does not exist');
    });

    test('Cannot create a folder with name containing a slash', async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload/folders',
        body: {
          name: 'folder 1/2',
          parent: null,
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('name cannot contain slashes');
    });

    test.each([[' abc'], [' abc '], ['abc '], ['   abc    '], ['   abc    ']])(
      'Cannot create a folder with name starting or ending with a whitespace (%p)',
      async (name) => {
        const res = await rq({
          method: 'POST',
          url: '/upload/folders',
          body: {
            name,
            parent: null,
          },
        });

        expect(res.status).toBe(400);
        expect(res.body.error.message).toBe('name cannot start or end with a whitespace');
      }
    );
  });

  describe('read', () => {
    test('Can read a folder', async () => {
      const res = await rq({
        method: 'GET',
        url: `/upload/folders/${data.folders[0].id}`,
      });

      expect(res.body.data).toMatchObject({
        ...pick(data.folders[0], ['id', 'name', 'pathId', 'path', 'createAt', 'updatedAt']),
        children: {
          count: expect.anything(),
        },
        files: {
          count: expect.anything(),
        },
      });
    });

    test('Can read a folder & populate its parent', async () => {
      const res = await rq({
        method: 'GET',
        url: `/upload/folders/${data.folders[1].id}`,
        qs: {
          populate: 'parent',
        },
      });

      expect(res.body.data).toMatchObject({
        ...pick(data.folders[1], ['id', 'name', 'pathId', 'path', 'createAt', 'updatedAt']),
        parent: {
          id: expect.any(Number),
        },
      });
    });

    test('Return 404 when folder does not exist', async () => {
      const res = await rq({
        method: 'GET',
        url: '/upload/folders/99999',
      });

      expect(res.status).toBe(404);
    });

    test('Can read folders', async () => {
      const res = await rq({
        method: 'GET',
        url: '/upload/folders',
      });

      expect(res.body.data).toEqual(
        expect.arrayContaining([
          {
            ...data.folders[0],
            children: { count: 1 },
            files: { count: 0 },
          },
          {
            ...data.folders[1],
            children: { count: 0 },
            files: { count: 0 },
          },
        ])
      );
    });

    test('Returns every folder and no pagination metadata unless a page is requested', async () => {
      const res = await rq({
        method: 'GET',
        url: '/upload/folders',
        qs: { sort: 'id:ASC' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.pagination).toBeUndefined();
      expect(res.body.data.length).toBeGreaterThanOrEqual(data.folders.length);
    });

    test('Can read folders page by page', async () => {
      const all = await rq({
        method: 'GET',
        url: '/upload/folders',
        qs: { sort: 'id:ASC' },
      });
      const total = all.body.data.length;

      const firstPage = await rq({
        method: 'GET',
        url: '/upload/folders',
        qs: { page: 1, pageSize: 1, sort: 'id:ASC' },
      });

      expect(firstPage.statusCode).toBe(200);
      expect(firstPage.body.data).toEqual([all.body.data[0]]);
      expect(firstPage.body.pagination).toEqual({ page: 1, pageSize: 1, pageCount: total, total });

      const secondPage = await rq({
        method: 'GET',
        url: '/upload/folders',
        qs: { page: 2, pageSize: 1, sort: 'id:ASC' },
      });

      expect(secondPage.statusCode).toBe(200);
      expect(secondPage.body.data).toEqual([all.body.data[1]]);
      expect(secondPage.body.pagination).toEqual({ page: 2, pageSize: 1, pageCount: total, total });
    });

    test('Can paginate a folder search', async () => {
      // Both fixture folders ('folder 1', 'folder-2') match, so a page of 1
      // proves that `total` counts the matches rather than the page.
      const all = await rq({
        method: 'GET',
        url: '/upload/folders',
        qs: { _q: 'folder', sort: 'id:ASC' },
      });
      const total = all.body.data.length;

      expect(total).toBeGreaterThanOrEqual(2);

      const res = await rq({
        method: 'GET',
        url: '/upload/folders',
        qs: { _q: 'folder', page: 1, pageSize: 1, sort: 'id:ASC' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toEqual([all.body.data[0]]);
      expect(res.body.pagination).toEqual({ page: 1, pageSize: 1, pageCount: total, total });
    });

    test('Rejects an invalid pageSize', async () => {
      const res = await rq({
        method: 'GET',
        url: '/upload/folders',
        qs: { page: 1, pageSize: -1 },
      });

      expect(res.statusCode).toBe(400);
    });

    test('Rejects a pageSize or offset past the safe integer range', async () => {
      const hugePageSize = await rq({
        method: 'GET',
        url: '/upload/folders',
        qs: { page: 1, pageSize: '99999999999999999999' },
      });

      expect(hugePageSize.statusCode).toBe(400);
      expect(hugePageSize.body.error.name).toBe('PaginationError');

      const hugeOffset = await rq({
        method: 'GET',
        url: '/upload/folders',
        qs: { page: 1000000000, pageSize: 1000000000 },
      });

      expect(hugeOffset.statusCode).toBe(400);
      expect(hugeOffset.body.error.name).toBe('PaginationError');
    });

    test('Can slice folders with start and limit, without pagination metadata', async () => {
      const all = await rq({
        method: 'GET',
        url: '/upload/folders',
        qs: { sort: 'id:ASC' },
      });

      const res = await rq({
        method: 'GET',
        url: '/upload/folders',
        qs: { start: 1, limit: 1, sort: 'id:ASC' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toEqual([all.body.data[1]]);
      expect(res.body.pagination).toBeUndefined();
    });

    test('Rejects a limit or start past the safe integer range', async () => {
      const hugeLimit = await rq({
        method: 'GET',
        url: '/upload/folders',
        qs: { limit: '99999999999999999999' },
      });

      expect(hugeLimit.statusCode).toBe(400);
      expect(hugeLimit.body.error.name).toBe('PaginationError');

      const hugeStart = await rq({
        method: 'GET',
        url: '/upload/folders',
        qs: { start: '99999999999999999999', limit: 1 },
      });

      expect(hugeStart.statusCode).toBe(400);
      expect(hugeStart.body.error.name).toBe('PaginationError');
    });

    test('Returns an empty page for a large offset within range', async () => {
      const res = await rq({
        method: 'GET',
        url: '/upload/folders',
        qs: { page: 100000, pageSize: 100000 },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination).toMatchObject({ page: 100000, pageSize: 100000 });
    });
  });

  describe('update', () => {
    test('Return 404 when folder does not exist', async () => {
      const res = await rq({
        method: 'PUT',
        url: '/upload/folders/99999',
        body: {
          name: 'new name',
        },
      });

      expect(res.status).toBe(404);
    });

    test('Rename a folder', async () => {
      const folder = await createFolder('folder-name', null);

      const res = await rq({
        method: 'PUT',
        url: `/upload/folders/${folder.id}`,
        body: {
          name: 'new name folder',
        },
      });

      expect(res.body.data).toMatchObject({
        name: 'new name folder',
        path: folder.path,
      });
      data.folders.push(res.body.data);
    });

    test('Cannot move and rename a folder if duplicated', async () => {
      const folder0 = await createFolder('folder-a-0', null);
      const folder1 = await createFolder('folder-a-1', null);
      const folder00 = await createFolder('folder-a-00', folder0.id);
      data.folders.push(folder0, folder1, folder00);

      const res = await rq({
        method: 'PUT',
        url: `/upload/folders/${folder1.id}`,
        body: {
          name: 'folder-a-00',
          parent: folder0.id,
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('A folder with this name already exists');
    });

    test('Cannot move a folder if duplicated', async () => {
      const folder0 = await createFolder('folder-b-0', null);
      const folder1 = await createFolder('folder-b-samename', null);
      await createFolder('folder-b-samename', folder0.id);
      data.folders.push(folder0, folder1);

      const res = await rq({
        method: 'PUT',
        url: `/upload/folders/${folder1.id}`,
        body: {
          parent: folder0.id,
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('A folder with this name already exists');
    });

    test('Cannot move a folder to a folder that does not exist', async () => {
      const folder = await createFolder('folder-c-0', null);
      data.folders.push(folder);

      const res = await rq({
        method: 'PUT',
        url: `/upload/folders/${folder.id}`,
        body: {
          parent: 9999,
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('parent folder does not exist');
    });

    test('Cannot move a folder inside itself (0 level)', async () => {
      const folder = await createFolder('folder-d-0', null);
      data.folders.push(folder);

      const res = await rq({
        method: 'PUT',
        url: `/upload/folders/${folder.id}`,
        body: {
          parent: folder.id,
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('folder cannot be moved inside itself');
    });

    test('Cannot move a folder inside itself (1 level)', async () => {
      const folder0 = await createFolder('folder-e-0', null);
      const folder00 = await createFolder('folder-e-00', folder0.id);
      data.folders.push(folder0, folder00);

      const res = await rq({
        method: 'PUT',
        url: `/upload/folders/${folder0.id}`,
        body: {
          parent: folder00.id,
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('folder cannot be moved inside itself');
    });

    test('Cannot move a folder inside itself (2 levels)', async () => {
      const folder0 = await createFolder('folder-f-0', null);
      const folder00 = await createFolder('folder-f-00', folder0.id);
      const folder000 = await createFolder('folder-f-000', folder00.id);
      data.folders.push(folder0, folder00, folder000);

      const res = await rq({
        method: 'PUT',
        url: `/upload/folders/${folder0.id}`,
        body: {
          parent: folder000.id,
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('folder cannot be moved inside itself');
    });

    test('Move a folder inside another folder', async () => {
      const folder0 = await createFolder('folder-0', null);
      const folder00 = await createFolder('folder-00', folder0.id);
      const folder01 = await createFolder('folder-01', folder0.id);
      const folder02 = await createFolder('folder-02', folder0.id);
      const folder000 = await createFolder('folder-000', folder00.id);
      const file000 = await createAFile(folder000.id);
      const file02 = await createAFile(folder02.id);

      // moving folder00 in folder01
      const res = await rq({
        method: 'PUT',
        url: `/upload/folders/${folder00.id}`,
        body: {
          name: 'folder-00-new',
          parent: folder01.id,
        },
      });

      expect(res.body.data).toMatchObject({
        name: 'folder-00-new',
        path: `${folder01.path}/${folder00.pathId}`,
      });

      const resFolders = await rq({
        method: 'GET',
        url: '/upload/folders',
        qs: {
          filters: {
            id: {
              $in: [folder0, folder00, folder01, folder02, folder000].map((folder) => folder?.id),
            },
          },
          sort: 'id:asc',
          populate: { parent: '*' },
        },
      });

      expect(resFolders.body.data[0]).toMatchObject({ path: folder0.path, parent: null });
      expect(resFolders.body.data[1]).toMatchObject({
        path: `${folder01.path}/${folder00.pathId}`,
        parent: { id: folder01.id },
      });
      expect(resFolders.body.data[2]).toMatchObject({
        path: folder01.path,
        parent: { id: folder0.id },
      });
      expect(resFolders.body.data[3]).toMatchObject({
        path: folder02.path,
        parent: { id: folder0.id },
      });
      expect(resFolders.body.data[4]).toMatchObject({
        path: `${folder01.path}/${folder00.pathId}/${folder000.pathId}`,
        parent: { id: folder00.id },
      });

      const resFiles = await rq({
        method: 'GET',
        url: '/upload/files',
        qs: {
          filters: { id: { $in: [file000.id, file02.id] } },
          sort: 'id:asc',
        },
      });

      expect(resFiles.body.results[0]).toMatchObject({
        folderPath: `${folder01.path}/${folder00.pathId}/${folder000.pathId}`,
      });
      expect(resFiles.body.results[1]).toMatchObject({ folderPath: file02.folderPath });

      data.folders.push(...resFolders.body.data);
    });

    test('Move a folder to root level', async () => {
      const folder0 = await createFolder('folder-test-0', null);
      const folder00 = await createFolder('folder-test-00', folder0.id);
      const folder02 = await createFolder('folder-test-02', folder0.id);
      const folder000 = await createFolder('folder-test-000', folder00.id);
      const file000 = await createAFile(folder000.id);
      const file02 = await createAFile(folder02.id);

      // moving folder00 in folder01
      const res = await rq({
        method: 'PUT',
        url: `/upload/folders/${folder00.id}`,
        body: {
          name: 'folder-test-00-new',
          parent: null,
        },
      });

      expect(res.body.data).toMatchObject({
        name: 'folder-test-00-new',
        path: `/${folder00.pathId}`,
      });

      const resFolders = await rq({
        method: 'GET',
        url: '/upload/folders',
        qs: {
          filters: {
            id: { $in: [folder0, folder00, folder02, folder000].map((folder) => folder?.id) },
          },
          sort: 'id:asc',
          populate: { parent: '*' },
        },
      });

      expect(resFolders.body.data[0]).toMatchObject({ path: folder0.path, parent: null });
      expect(resFolders.body.data[1]).toMatchObject({
        path: `/${folder00.pathId}`,
        parent: null,
      });
      expect(resFolders.body.data[2]).toMatchObject({
        path: folder02.path,
        parent: { id: folder0.id },
      });
      expect(resFolders.body.data[3]).toMatchObject({
        path: `/${folder00.pathId}/${folder000.pathId}`,
        parent: { id: folder00.id },
      });

      const resFiles = await rq({
        method: 'GET',
        url: '/upload/files',
        qs: {
          filters: { id: { $in: [file000.id, file02.id] } },
          sort: 'id:asc',
        },
      });

      expect(resFiles.body.results[0]).toMatchObject({
        folderPath: `/${folder00.pathId}/${folder000.pathId}`,
      });
      expect(resFiles.body.results[1]).toMatchObject({ folderPath: file02.folderPath });

      data.folders.push(...resFolders.body.data);
    });
  });
});
