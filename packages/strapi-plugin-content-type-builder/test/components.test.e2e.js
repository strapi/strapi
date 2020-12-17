'use strict';

const { registerAndLogin } = require('../../../test/helpers/auth');
const { createAuthRequest } = require('../../../test/helpers/request');
const waitRestart = require('../../../test/helpers/waitRestart');

let rq;

describe('Content Type Builder - Components', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);
  }, 60000);

  describe('POST /components', () => {
    test('Validates input and return 400 in case of invalid input', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-type-builder/components',
        body: {
          component: {},
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        error: {
          'component.category': ['category.required'],
          'component.icon': ['icon.required'],
          'component.attributes': ['attributes.required'],
          'component.name': ['name.required'],
        },
      });
    });

    test('Creates a component properly', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-type-builder/components',
        body: {
          component: {
            category: 'default',
            icon: 'default',
            name: 'Some Component',
            attributes: {
              title: {
                type: 'string',
              },
              pic: {
                type: 'media',
              },
            },
          },
        },
      });

      expect(res.statusCode).toBe(201);
      expect(res.body).toEqual({
        data: {
          uid: 'default.some-component',
        },
      });

      await waitRestart();
    }, 10000);

    test('Errors on already existing components', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-type-builder/components',
        body: {
          component: {
            category: 'default',
            icon: 'default',
            name: 'someComponent',
            attributes: {},
          },
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        error: 'component.alreadyExists',
      });
    });
  });

  describe('Get /components', () => {
    test('Returns valid enveloppe', async () => {
      const res = await rq({
        method: 'GET',
        url: '/content-type-builder/components',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        data: expect.any(Array),
      });

      res.body.data.forEach(el => {
        expect(el).toMatchObject({
          uid: expect.any(String),
          schema: expect.objectContaining({
            name: expect.any(String),
            description: expect.any(String),
            connection: expect.any(String),
            collectionName: expect.any(String),
            attributes: expect.objectContaining({}),
          }),
        });
      });
    });
  });

  describe('GET /components/:uid', () => {
    test('Returns 404 on not found', async () => {
      const res = await rq({
        method: 'GET',
        url: '/content-type-builder/components/nonexistent-component',
      });

      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({
        error: 'component.notFound',
      });
    });

    test('Returns correct format', async () => {
      const res = await rq({
        method: 'GET',
        url: '/content-type-builder/components/default.some-component',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        data: {
          uid: 'default.some-component',
          category: 'default',
          schema: {
            icon: 'default',
            name: 'Some Component',
            description: '',
            connection: 'default',
            collectionName: 'components_default_some_components',
            attributes: {
              title: {
                type: 'string',
              },
              pic: {
                type: 'media',
                multiple: false,
                required: false,
              },
            },
          },
        },
      });
    });
  });

  describe('PUT /components/:uid', () => {
    test('Throws 404 on updating non existent component', async () => {
      const res = await rq({
        method: 'PUT',
        url: '/content-type-builder/components/nonexistent-components',
      });

      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({
        error: 'component.notFound',
      });
    });

    test('Validates input and return 400 in case of invalid input', async () => {
      const res = await rq({
        method: 'PUT',
        url: '/content-type-builder/components/default.some-component',
        body: {
          component: {
            attributes: {},
          },
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        error: {
          'component.category': ['category.required'],
          'component.icon': ['icon.required'],
          'component.name': ['name.required'],
        },
      });
    });

    test('Updates a component properly', async () => {
      const res = await rq({
        method: 'PUT',
        url: '/content-type-builder/components/default.some-component',
        body: {
          component: {
            category: 'default',
            icon: 'default',
            name: 'New Component',
            attributes: {},
          },
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        data: {
          uid: 'default.some-component',
        },
      });

      await waitRestart();

      const getRes = await rq({
        method: 'GET',
        url: '/content-type-builder/components/default.some-component',
      });

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body).toMatchObject({
        data: {
          uid: 'default.some-component',
          schema: {
            name: 'New Component',
          },
        },
      });
    }, 10000);
  });

  describe('DELETE /components/:uid', () => {
    test('Throws 404 on non existent component', async () => {
      const res = await rq({
        method: 'DELETE',
        url: '/content-type-builder/components/nonexistent-components',
      });

      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({
        error: 'component.notFound',
      });
    });

    test('Deletes a component correctly', async () => {
      const res = await rq({
        method: 'DELETE',
        url: '/content-type-builder/components/default.some-component',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        data: {
          uid: 'default.some-component',
        },
      });

      await waitRestart();

      const tryGet = await rq({
        method: 'GET',
        url: '/content-type-builder/components/default.some-component',
      });

      expect(tryGet.statusCode).toBe(404);
      expect(tryGet.body).toEqual({
        error: 'component.notFound',
      });
    }, 10000);
  });
});
