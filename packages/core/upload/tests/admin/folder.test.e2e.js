'use strict';

// Test a simple default API with no relations

const { omit, pick } = require('lodash/fp');

const { createTestBuilder } = require('../../../../../test/helpers/builder');
const { createStrapiInstance } = require('../../../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../../../test/helpers/request');

let strapi;
let rq;
let data = {
  folders: [],
};

const uuidRegex = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
const rootLocationRegex = /^\/[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
const getFolderLocationRegex = uid =>
  new RegExp(
    '^/' + uid + '/[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$',
    'i'
  );

describe('Folder', () => {
  const builder = createTestBuilder();

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
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
        location: expect.stringMatching(rootLocationRegex),
        createdAt: expect.anything(),
        updatedAt: expect.anything(),
        parent: null,
      });
      expect(res.body.data.uid).toBe(res.body.data.location.split('/').pop());

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
        location: expect.stringMatching(getFolderLocationRegex(data.folders[0].uid)),
        createdAt: expect.anything(),
        updatedAt: expect.anything(),
        parent: data.folders[0],
      });
      expect(res.body.data.uid).toBe(res.body.data.location.split('/').pop());

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
          parent: data.folders[0],
        },
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('name already taken');
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
            parent: pick(
              ['createdAt', 'id', 'name', 'location', 'uid', 'updatedAt'],
              data.folders[0]
            ),
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
    test('Can delete folders', async () => {
      const res = await rq({
        method: 'POST',
        url: '/upload/folders/batch-delete',
        body: {
          ids: data.folders.map(f => f.id),
        },
      });

      expect(res.body.data).toEqual(
        expect.arrayContaining([
          pick(['id', 'name', 'location', 'uid', 'updatedAt', 'createdAt'])(data.folders[0]),
          pick(['id', 'name', 'location', 'uid', 'updatedAt', 'createdAt'])(data.folders[1]),
        ])
      );
    });
  });
});
