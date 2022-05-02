'use strict';

const fs = require('fs');
const path = require('path');

const { omit, pick, map } = require('lodash/fp');

const { createTestBuilder } = require('../../../../../test/helpers/builder');
const { createStrapiInstance } = require('../../../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../../../test/helpers/request');

let strapi;
let rq;
let data = {
  folders: [],
};

const uuidRegex = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
const rootPathRegex = /^\/[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
const getFolderPathRegex = uid =>
  new RegExp(
    '^/' + uid + '/[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$',
    'i'
  );

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
        folderIds: data.folders.map(f => f.id),
      },
    });

    await strapi.destroy();
    await builder.cleanup();
  });

  describe('create', () => {
    test('Can create a folder at root level', async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload/folders?populate=parent',
        body: {
          name: 'folder 1',
          parent: null,
        },
      });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        id: expect.anything(),
        name: 'folder 1',
        uid: expect.stringMatching(uuidRegex),
        path: expect.stringMatching(rootPathRegex),
        createdAt: expect.anything(),
        updatedAt: expect.anything(),
        parent: null,
      });
      expect(res.body.data.uid).toBe(res.body.data.path.split('/').pop());

      data.folders.push(omit('parent', res.body.data));
    });

    test('Can create a folder inside another folder', async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload/folders?populate=parent',
        body: {
          name: 'folder-2',
          parent: data.folders[0].id,
        },
      });

      expect(res.body.data).toMatchObject({
        id: expect.anything(),
        name: 'folder-2',
        uid: expect.stringMatching(uuidRegex),
        path: expect.stringMatching(getFolderPathRegex(data.folders[0].uid)),
        createdAt: expect.anything(),
        updatedAt: expect.anything(),
        parent: data.folders[0],
      });
      expect(res.body.data.uid).toBe(res.body.data.path.split('/').pop());

      data.folders.push(omit('parent', res.body.data));
    });

    test('Cannot create a folder with duplicated name at root level', async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload/folders?populate=parent',
        body: {
          name: 'folder 1',
          parent: null,
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('name already taken');
    });

    test('Cannot create a folder with duplicated name inside a folder', async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload/folders?populate=parent',
        body: {
          name: 'folder-2',
          parent: data.folders[0].id,
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('name already taken');
    });

    test('Cannot create a folder inside a folder that does not exist', async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload/folders?populate=parent',
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
        url: '/upload/folders?populate=parent',
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
      async name => {
        const res = await rq({
          method: 'POST',
          url: '/upload/folders?populate=parent',
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
    test('Can read folders', async () => {
      const res = await rq({
        method: 'GET',
        url: '/upload/folders',
      });

      expect(res.body.pagination).toMatchObject({
        page: 1,
        pageCount: 1,
        pageSize: 10,
        total: 2,
      });
      expect(res.body.results).toEqual(
        expect.arrayContaining([
          {
            ...data.folders[0],
            children: { count: 1 },
            createdBy: {
              firstname: expect.anything(),
              id: expect.anything(),
              lastname: expect.anything(),
              username: null,
            },
            files: { count: 0 },
            parent: null,
            updatedBy: {
              firstname: expect.anything(),
              id: expect.anything(),
              lastname: expect.anything(),
              username: null,
            },
          },
          {
            ...data.folders[1],
            children: { count: 0 },
            createdBy: {
              firstname: expect.anything(),
              id: expect.anything(),
              lastname: expect.anything(),
              username: null,
            },
            files: { count: 0 },
            parent: pick(['createdAt', 'id', 'name', 'path', 'uid', 'updatedAt'], data.folders[0]),
            updatedBy: {
              firstname: expect.anything(),
              id: expect.anything(),
              lastname: expect.anything(),
              username: null,
            },
          },
        ])
      );
    });
  });

  describe('delete', () => {
    test('Can delete folders and belonging files', async () => {
      const folder1 = await createFolder('folder1', null);
      const folder1a = await createFolder('folder1a', folder1.id);
      const folder1b = await createFolder('folder1b', folder1.id);
      const folder1a1 = await createFolder('folder1a1', folder1a.id);
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
            name: 'folder1a',
            path: expect.anything(),
            uid: expect.anything(),
            createdAt: expect.anything(),
            updatedAt: expect.anything(),
          },
        ],
      });

      const resFolder = await rq({
        method: 'GET',
        url: '/upload/folders?pagination[pageSize]=100',
      });

      const existingfoldersIds = resFolder.body.results.map(f => f.id);
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
    });
  });

  describe('update', () => {
    test('rename a folder', async () => {
      const folder = await createFolder('folder-name', null);

      const res = await rq({
        method: 'PUT',
        url: `/upload/folders/${folder.id}`,
        body: {
          name: 'new name',
        },
      });

      expect(res.body.data).toMatchObject({
        name: 'new name',
        path: folder.path,
      });
      data.folders.push(res.body.data);
    });

    test('cannot rename a folder if duplicated', async () => {
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
      expect(res.body.error.message).toBe('name already taken');
    });

    test('cannot move a folder to a folder that does not exist', async () => {
      const folder = await createFolder('folder-b-0', null);
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

    test('move a folder inside another folder', async () => {
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
        path: `${folder01.path}/${folder00.uid}`,
      });

      const resFolders = await rq({
        method: 'GET',
        url: '/upload/folders',
        qs: {
          filters: { id: { $in: map('id', [folder0, folder00, folder01, folder02, folder000]) } },
          sort: 'id:asc',
          populate: 'parent',
        },
      });

      expect(resFolders.body.results[0]).toMatchObject({ path: folder0.path, parent: null });
      expect(resFolders.body.results[1]).toMatchObject({
        path: `${folder01.path}/${folder00.uid}`,
        parent: { id: folder01.id },
      });
      expect(resFolders.body.results[2]).toMatchObject({
        path: folder01.path,
        parent: { id: folder0.id },
      });
      expect(resFolders.body.results[3]).toMatchObject({
        path: folder02.path,
        parent: { id: folder0.id },
      });
      expect(resFolders.body.results[4]).toMatchObject({
        path: `${folder01.path}/${folder00.uid}/${folder000.uid}`,
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
        folderPath: `${folder01.path}/${folder00.uid}/${folder000.uid}`,
      });
      expect(resFiles.body.results[1]).toMatchObject({ folderPath: file02.folderPath });

      data.folders.push(...resFolders.body.results);
    });

    test('move a folder to root level', async () => {
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
        path: `/${folder00.uid}`,
      });

      const resFolders = await rq({
        method: 'GET',
        url: '/upload/folders',
        qs: {
          filters: { id: { $in: map('id', [folder0, folder00, folder02, folder000]) } },
          sort: 'id:asc',
          populate: 'parent',
        },
      });

      expect(resFolders.body.results[0]).toMatchObject({ path: folder0.path, parent: null });
      expect(resFolders.body.results[1]).toMatchObject({
        path: `/${folder00.uid}`,
        parent: null,
      });
      expect(resFolders.body.results[2]).toMatchObject({
        path: folder02.path,
        parent: { id: folder0.id },
      });
      expect(resFolders.body.results[3]).toMatchObject({
        path: `/${folder00.uid}/${folder000.uid}`,
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
        folderPath: `/${folder00.uid}/${folder000.uid}`,
      });
      expect(resFiles.body.results[1]).toMatchObject({ folderPath: file02.folderPath });

      data.folders.push(...resFolders.body.results);
    });
  });
});
