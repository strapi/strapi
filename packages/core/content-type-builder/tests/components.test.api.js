'use strict';

const { createAuthRequest } = require('../../../../test/helpers/request');
const { createStrapiInstance } = require('../../../../test/helpers/strapi');

let strapi;
let rq;

const restart = async () => {
  await strapi.destroy();
  strapi = await createStrapiInstance();
  rq = await createAuthRequest({ strapi });
};

describe('Content Type Builder - Components', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
  });

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
          details: {
            errors: [
              {
                message: 'attributes.required',
                name: 'ValidationError',
                path: ['component', 'attributes'],
              },
              {
                message: 'displayName.required',
                name: 'ValidationError',
                path: ['component', 'displayName'],
              },
              {
                message: 'category.required',
                name: 'ValidationError',
                path: ['component', 'category'],
              },
            ],
          },
          message: '3 errors occurred',
          name: 'ValidationError',
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
            displayName: 'Some Component',
            pluginOptions: {
              pluginName: {
                option: true,
              },
            },
            attributes: {
              title: {
                type: 'string',
                pluginOptions: {
                  pluginName: {
                    option: true,
                  },
                },
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

      await restart();
    });

    test('Errors on already existing components', async () => {
      const res = await rq({
        method: 'POST',
        url: '/content-type-builder/components',
        body: {
          component: {
            category: 'default',
            displayName: 'someComponent',
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

      res.body.data.forEach((el) => {
        expect(el).toMatchObject({
          uid: expect.any(String),
          schema: expect.objectContaining({
            displayName: expect.any(String),
            description: expect.any(String),
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
            displayName: 'Some Component',
            description: '',
            collectionName: 'components_default_some_components',
            pluginOptions: {
              pluginName: {
                option: true,
              },
            },
            attributes: {
              title: {
                type: 'string',
                pluginOptions: {
                  pluginName: {
                    option: true,
                  },
                },
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
          details: {
            errors: [
              {
                message: 'displayName.required',
                name: 'ValidationError',
                path: ['component', 'displayName'],
              },
              {
                message: 'category.required',
                name: 'ValidationError',
                path: ['component', 'category'],
              },
            ],
          },
          message: '2 errors occurred',
          name: 'ValidationError',
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
            displayName: 'New Component',
            attributes: {
              name: {
                type: 'string',
              },
            },
            pluginOptions: {
              pluginName: {
                option: false,
              },
            },
          },
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        data: {
          uid: 'default.some-component',
        },
      });

      await restart();

      const getRes = await rq({
        method: 'GET',
        url: '/content-type-builder/components/default.some-component',
      });

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body).toMatchObject({
        data: {
          uid: 'default.some-component',
          schema: {
            displayName: 'New Component',
            pluginOptions: {
              pluginName: {
                option: false,
              },
            },
          },
        },
      });
    });
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

      await restart();

      const tryGet = await rq({
        method: 'GET',
        url: '/content-type-builder/components/default.some-component',
      });

      expect(tryGet.statusCode).toBe(404);
      expect(tryGet.body).toEqual({
        error: 'component.notFound',
      });
    });
  });
});
