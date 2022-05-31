'use strict';

const { createTestBuilder } = require('../../../../../test/helpers/builder');
const { createStrapiInstance } = require('../../../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../../../test/helpers/request');

let strapi;
let rq;
let data = {
  folders: [],
};

const createFolder = async (name, parent = null) => {
  const res = await rq({
    method: 'POST',
    url: '/upload/folders',
    body: { name, parent },
  });
  return res.body.data;
};

describe('Folder structure', () => {
  const builder = createTestBuilder();

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    // delete all possibly existing folders
    const res = await rq({
      method: 'GET',
      url: '/upload/folders',
    });

    await rq({
      method: 'POST',
      url: '/upload/actions/bulk-delete',
      body: {
        folderIds: res.body.data.map(f => f.id),
      },
    });

    const rootFolder1 = await createFolder('folder1');
    const rootFolder2 = await createFolder('folder2');
    const nestedFolder1a = await createFolder('folder1A', rootFolder1.id);
    const nestedFolder1b = await createFolder('folder1B', rootFolder1.id);
    const nestedFolder1a1 = await createFolder('folder1A1', nestedFolder1a.id);
    data.folders.push(rootFolder1, rootFolder2, nestedFolder1a, nestedFolder1b, nestedFolder1a1);
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

  describe('Read', () => {
    test('get structure', async () => {
      const res = await rq({
        method: 'GET',
        url: '/upload/folder-structure',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        data: [
          {
            children: [
              {
                children: [{ children: [], id: expect.anything(), name: 'folder1A1' }],
                id: expect.anything(),
                name: 'folder1A',
              },
              { children: [], id: expect.anything(), name: 'folder1B' },
            ],
            id: expect.anything(),
            name: 'folder1',
          },
          { children: [], id: expect.anything(), name: 'folder2' },
        ],
      });
    });
  });
});
