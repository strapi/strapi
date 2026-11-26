'use strict';

const fs = require('fs');
const path = require('path');

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

let strapi;
let rq;
const data = {
  folders: {},
};

const createFolder = async (name, parent = null) => {
  const res = await rq({
    method: 'POST',
    url: '/upload/folders',
    body: { name, parent },
  });
  return res.body.data;
};

const createFile = async (name, folder = null) => {
  const res = await rq({
    method: 'POST',
    url: '/upload',
    formData: {
      files: fs.createReadStream(path.join(__dirname, '../utils/rec.jpg')),
      fileInfo: JSON.stringify({ name, folder }),
    },
  });
  return res.body[0];
};

describe('Search limited to a folder (admin)', () => {
  const builder = createTestBuilder();

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    data.folders.outer = await createFolder('scope-outer');
    data.folders.inner = await createFolder('scope-inner', data.folders.outer.id);
    data.folders.sibling = await createFolder('scope-sibling');

    await createFile('scope-root.jpg');
    await createFile('scope-outer.jpg', data.folders.outer.id);
    await createFile('scope-inner.jpg', data.folders.inner.id);
    await createFile('scope-sibling.jpg', data.folders.sibling.id);
  });

  afterAll(async () => {
    await rq({
      method: 'POST',
      url: '/upload/actions/bulk-delete',
      body: { folderIds: Object.values(data.folders).map((folder) => folder.id) },
    });
    const { body } = await rq({ method: 'GET', url: '/upload/files', qs: { _q: 'scope-' } });
    await rq({
      method: 'POST',
      url: '/upload/actions/bulk-delete',
      body: { fileIds: body.results.map((file) => file.id) },
    });

    await strapi.destroy();
    await builder.cleanup();
  });

  test('files: matches the folder and its subfolders by folderPath', async () => {
    const { path: outerPath } = data.folders.outer;

    const res = await rq({
      method: 'GET',
      url: '/upload/files',
      qs: {
        _q: 'scope-',
        filters: {
          $and: [
            {
              $or: [{ folderPath: outerPath }, { folderPath: { $startsWith: `${outerPath}/` } }],
            },
          ],
        },
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.results.map((file) => file.name).sort()).toEqual([
      'scope-inner.jpg',
      'scope-outer.jpg',
    ]);
  });

  test('folders: matches only subfolders, at any depth', async () => {
    const { path: outerPath } = data.folders.outer;

    const res = await rq({
      method: 'GET',
      url: '/upload/folders',
      qs: {
        _q: 'scope-',
        filters: { $and: [{ path: { $startsWith: `${outerPath}/` } }] },
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.map((folder) => folder.name)).toEqual(['scope-inner']);
  });
});
