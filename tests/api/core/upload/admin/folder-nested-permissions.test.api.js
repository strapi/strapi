'use strict';

const fs = require('fs');
const path = require('path');

const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

/**
 * This test asserts that the id-based filter works for super admin against
 * nested folders, and that fetching the deep folder + its files succeeds.
 */
describe('Upload | super admin nested folder access', () => {
  let strapi;
  let rq;
  const data = { folders: [], file: null };

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    const createFolder = async (name, parent = null) => {
      const res = await rq({
        method: 'POST',
        url: '/upload/folders',
        body: { name, parent },
      });
      expect(res.statusCode).toBe(201);
      return res.body.data;
    };

    // Build a 4-level deep tree: root → level-1 → level-2 → level-3
    data.folders.push(await createFolder('nested-root'));
    data.folders.push(await createFolder('nested-level-1', data.folders[0].id));
    data.folders.push(await createFolder('nested-level-2', data.folders[1].id));
    data.folders.push(await createFolder('nested-level-3', data.folders[2].id));

    // Drop a file inside the deepest folder
    const uploadRes = await rq({
      method: 'POST',
      url: '/upload',
      formData: {
        files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
        fileInfo: JSON.stringify({ folder: data.folders[3].id }),
      },
    });
    expect(uploadRes.statusCode).toBe(201);
    data.file = uploadRes.body[0];
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
  });

  test('super admin can fetch a folder at depth 3 by id', async () => {
    const res = await rq({
      method: 'GET',
      url: `/upload/folders/${data.folders[3].id}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      id: data.folders[3].id,
      name: 'nested-level-3',
    });
  });

  test('super admin can list files inside a deeply nested folder using folder.id filter', async () => {
    const res = await rq({
      method: 'GET',
      url: '/upload/files',
      qs: {
        filters: {
          $and: [{ folder: { id: data.folders[3].id } }],
        },
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0]).toMatchObject({ id: data.file.id });
  });

  test('super admin can list files at every depth without a 403', async () => {
    for (let i = 0; i < data.folders.length; i += 1) {
      const res = await rq({
        method: 'GET',
        url: '/upload/files',
        qs: {
          filters: { $and: [{ folder: { id: data.folders[i].id } }] },
        },
      });

      expect(res.statusCode).not.toBe(403);
      expect(res.statusCode).toBe(200);
    }
  });

  test('super admin can fetch the folder structure tree', async () => {
    const res = await rq({
      method: 'GET',
      url: '/upload/folder-structure',
    });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    // The nested-root branch should be present in the tree
    const root = res.body.data.find((f) => f.name === 'nested-root');
    expect(root).toBeDefined();
  });
});
