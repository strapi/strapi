'use strict';

// Helpers.
const { createStrapiInstance } = require('../../../../test/helpers/strapi');
const { createContentAPIRequest } = require('../../../../test/helpers/request');
const { createTestBuilder } = require('../../../../test/helpers/builder');

const builder = createTestBuilder();
let strapi;
let rq;
const uid = 'single-type';
const data = {};

const model = {
  kind: 'singleType',
  displayName: 'single-type',
  singularName: 'single-type',
  pluralName: 'single-types',
  attributes: {
    title: {
      type: 'string',
    },
  },
};

describe('Content Manager single types', () => {
  beforeAll(async () => {
    await builder.addContentType(model).build();

    strapi = await createStrapiInstance();

    rq = await createContentAPIRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('find single type content returns 404 when not created', async () => {
    const res = await rq({
      url: `/${uid}`,
      method: 'GET',
    });

    expect(res.statusCode).toBe(404);
  });

  test('Create content', async () => {
    const res = await rq({
      url: `/${uid}`,
      method: 'PUT',
      body: {
        data: {
          title: 'Title',
        },
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      id: expect.anything(),
      attributes: {
        title: 'Title',
      },
    });

    data.id = res.body.data.id;
  });

  test('Update keeps the same data id', async () => {
    const res = await rq({
      url: `/${uid}`,
      method: 'PUT',
      body: {
        data: {
          title: 'Title',
        },
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      id: data.id,
      attributes: {
        title: 'Title',
      },
    });
  });

  test('find single type content returns an object ', async () => {
    const res = await rq({
      url: `/${uid}`,
      method: 'GET',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      id: expect.anything(),
      attributes: {
        title: 'Title',
      },
    });
  });

  test('Delete single type content returns an object and makes data unavailable', async () => {
    const res = await rq({
      url: `/${uid}`,
      method: 'DELETE',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      id: expect.anything(),
      attributes: {
        title: 'Title',
      },
    });

    const getRes = await rq({
      url: `/${uid}`,
      method: 'GET',
    });

    expect(getRes.statusCode).toBe(404);
  });
});
