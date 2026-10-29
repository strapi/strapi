'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAgent } = require('api-tests/agent');
const { createContentAPIRequest, createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;
let rqAdmin;

const folders = {};
const tokenIds = [];

const createFolder = async (name, parent = null) => {
  const res = await rqAdmin({ method: 'POST', url: '/upload/folders', body: { name, parent } });

  return res.body.data;
};

const createTokenRequest = async (body) => {
  const res = await rqAdmin({
    method: 'POST',
    url: '/admin/api-tokens',
    body: { name: `folders-${tokenIds.length}`, lifespan: null, ...body },
  });

  tokenIds.push(res.body.data.id);

  return createContentAPIRequest({ strapi, auth: { token: res.body.data.accessKey } });
};

describe('Upload content API - read-only folders routes', () => {
  beforeAll(async () => {
    await builder.build();
    strapi = await createStrapiInstance({ bypassAuth: false });
    rqAdmin = await createAuthRequest({ strapi });
    rq = await createTokenRequest({ type: 'full-access' });

    folders.clients = await createFolder('Clients');
    folders.acme = await createFolder('Acme', folders.clients.id);
    folders.year = await createFolder('2026', folders.acme.id);
    folders.archive = await createFolder('Archive');
  });

  afterAll(async () => {
    await rqAdmin({
      method: 'POST',
      url: '/upload/actions/bulk-delete',
      body: { folderIds: [folders.clients.id, folders.archive.id] },
    });
    await Promise.all(
      tokenIds.map((id) => rqAdmin({ method: 'DELETE', url: `/admin/api-tokens/${id}` }))
    );

    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Permissions', () => {
    test('refuses a request without a token', async () => {
      const rqPublic = createAgent(strapi, { urlPrefix: '/api' });

      const res = await rqPublic({ method: 'GET', url: '/upload/folders' });

      expect(res.statusCode).toBe(403);
    });

    test('refuses a custom token without the folder permissions', async () => {
      const rqCustom = await createTokenRequest({
        type: 'custom',
        permissions: ['plugin::upload.content-api.find'],
      });

      const list = await rqCustom({ method: 'GET', url: '/upload/folders' });
      const one = await rqCustom({ method: 'GET', url: `/upload/folders/${folders.acme.id}` });

      expect(list.statusCode).toBe(403);
      expect(one.statusCode).toBe(403);
    });

    test('grants listing and reading one folder separately', async () => {
      const rqFind = await createTokenRequest({
        type: 'custom',
        permissions: ['plugin::upload.folder.find'],
      });
      const rqFindOne = await createTokenRequest({
        type: 'custom',
        permissions: ['plugin::upload.folder.findOne'],
      });
      const one = `/upload/folders/${folders.acme.id}`;

      const findList = await rqFind({ method: 'GET', url: '/upload/folders' });
      const findOne = await rqFind({ method: 'GET', url: one });
      const findOneList = await rqFindOne({ method: 'GET', url: '/upload/folders' });
      const findOneOne = await rqFindOne({ method: 'GET', url: one });

      expect(findList.statusCode).toBe(200);
      expect(findList.body.data.map((folder) => folder.id)).toEqual(
        expect.arrayContaining([folders.clients.id, folders.acme.id])
      );
      expect(findOne.statusCode).toBe(403);
      expect(findOneList.statusCode).toBe(403);
      expect(findOneOne.statusCode).toBe(200);
      expect(findOneOne.body.data.id).toBe(folders.acme.id);
    });

    test('lists folders with a read-only token', async () => {
      const rqReadOnly = await createTokenRequest({ type: 'read-only' });

      const res = await rqReadOnly({ method: 'GET', url: '/upload/folders' });

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /upload/folders', () => {
    test('returns a paginated flat list', async () => {
      const res = await rq({
        method: 'GET',
        url: '/upload/folders',
        qs: {
          filters: { path: { $startsWith: folders.clients.path } },
          pagination: { page: 2, pageSize: 2 },
          sort: 'id:asc',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.map((folder) => folder.id)).toEqual([folders.year.id]);
      expect(res.body.meta.pagination).toEqual({ page: 2, pageSize: 2, pageCount: 2, total: 3 });
    });

    test('returns the id, both paths and the parent of a nested folder', async () => {
      const res = await rq({
        method: 'GET',
        url: '/upload/folders',
        qs: { filters: { id: folders.year.id } },
      });

      expect(res.body.data).toEqual([
        {
          id: folders.year.id,
          documentId: expect.any(String),
          name: '2026',
          path: folders.year.path,
          namePath: '/Clients/Acme/2026',
          parent: { id: folders.acme.id, documentId: expect.any(String) },
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      ]);
    });

    test('filters by parent, including the library root', async () => {
      const children = await rq({
        method: 'GET',
        url: '/upload/folders',
        qs: { filters: { parent: { id: folders.clients.id } } },
      });
      const roots = await rq({
        method: 'GET',
        url: '/upload/folders',
        qs: { filters: { parent: { id: { $null: true } } } },
      });

      expect(children.body.data.map((folder) => folder.id)).toEqual([folders.acme.id]);
      expect(roots.body.data.map((folder) => folder.id)).toEqual(
        expect.arrayContaining([folders.archive.id, folders.clients.id])
      );
      expect(roots.body.data.every((folder) => folder.parent === null)).toBe(true);
    });

    test('filters a whole subtree by path', async () => {
      const res = await rq({
        method: 'GET',
        url: '/upload/folders',
        qs: { filters: { path: { $startsWith: folders.clients.path } }, sort: 'id:asc' },
      });

      expect(res.body.data.map((folder) => folder.id)).toEqual([
        folders.clients.id,
        folders.acme.id,
        folders.year.id,
      ]);
    });

    test('never returns the files or children of a folder', async () => {
      const res = await rq({
        method: 'GET',
        url: '/upload/folders',
        qs: { populate: ['files', 'children'], fields: ['pathId'] },
      });

      expect(res.statusCode).toBe(200);
      res.body.data.forEach((folder) => {
        expect(Object.keys(folder).sort()).toEqual(
          [
            'createdAt',
            'documentId',
            'id',
            'name',
            'namePath',
            'parent',
            'path',
            'updatedAt',
          ].sort()
        );
      });
    });
  });

  describe('GET /upload/folders/:id', () => {
    test('returns a folder by id or by documentId', async () => {
      const byId = await rq({ method: 'GET', url: `/upload/folders/${folders.acme.id}` });
      const byDocumentId = await rq({
        method: 'GET',
        url: `/upload/folders/${byId.body.data.documentId}`,
      });

      expect(byId.statusCode).toBe(200);
      expect(byId.body.data).toMatchObject({
        id: folders.acme.id,
        namePath: '/Clients/Acme',
        parent: { id: folders.clients.id },
      });
      expect(byDocumentId.body.data).toEqual(byId.body.data);
    });

    test('returns 404 for an unknown folder', async () => {
      const res = await rq({ method: 'GET', url: '/upload/folders/999999' });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('Folder changes', () => {
    test('reflects a renamed or moved folder in its paths and parent', async () => {
      const brand = await createFolder('Brand', folders.clients.id);
      const logo = await createFolder('Logo', brand.id);

      await rqAdmin({
        method: 'PUT',
        url: `/upload/folders/${brand.id}`,
        body: { name: 'Brands' },
      });
      const renamed = await rq({ method: 'GET', url: `/upload/folders/${logo.id}` });

      await rqAdmin({
        method: 'PUT',
        url: `/upload/folders/${logo.id}`,
        body: { parent: folders.archive.id },
      });
      const moved = await rq({ method: 'GET', url: `/upload/folders/${logo.id}` });

      expect(renamed.body.data).toMatchObject({ namePath: '/Clients/Brands/Logo' });
      expect(moved.body.data).toMatchObject({
        path: `${folders.archive.path}/${logo.pathId}`,
        namePath: '/Archive/Logo',
        parent: { id: folders.archive.id },
      });
    });
  });
});
