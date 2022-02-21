'use strict';

// Helpers.
const { createTestBuilder } = require('../../../../../../test/helpers/builder');
const { createStrapiInstance } = require('../../../../../../test/helpers/strapi');
const form = require('../../../../../../test/helpers/generators');
const { createAuthRequest } = require('../../../../../../test/helpers/request');

const builder = createTestBuilder();
let strapi;
let rq;

const restart = async () => {
  await strapi.destroy();
  strapi = await createStrapiInstance();
  rq = await createAuthRequest({ strapi });
};

const FIXTURE_DEFAULT_LAYOUT = [
  [
    {
      name: 'title',
      size: 6,
    },
    {
      name: 'date',
      size: 4,
    },
  ],
  [
    {
      name: 'jsonField',
      size: 12,
    },
  ],
  [
    {
      name: 'content',
      size: 12,
    },
  ],
];

describe('Content Manager - Update Layout', () => {
  beforeAll(async () => {
    await builder.addContentTypes([form.article]).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Fetch default layout', async () => {
    const { body } = await rq({
      url: '/content-manager/content-types/api::article.article/configuration',
      method: 'GET',
    });

    expect(body.data.contentType.layouts.edit).toStrictEqual(FIXTURE_DEFAULT_LAYOUT);
  });

  test('Update field size', async () => {
    const payload = [...FIXTURE_DEFAULT_LAYOUT];
    payload[0][0].size = 12;

    await rq({
      url: '/content-manager/content-types/api::article.article/configuration',
      method: 'PUT',
      body: {
        layouts: {
          edit: payload,
          editRelations: [],
          list: [],
        },
      },
    });

    const { body } = await rq({
      url: '/content-manager/content-types/api::article.article/configuration',
      method: 'GET',
    });

    expect(body.data.contentType.layouts.edit[0][0].size).toBe(12);
  });

  test('Update field size with server restart and invalid JSON size', async () => {
    const payload = [...FIXTURE_DEFAULT_LAYOUT];
    payload[0][0].size = 8; // title
    payload[0][1].size = 4; // date
    payload[1][0].size = 6; // jsonField

    await rq({
      url: '/content-manager/content-types/api::article.article/configuration',
      method: 'PUT',
      body: {
        layouts: {
          edit: payload,
          editRelations: [],
          list: [],
        },
      },
    });

    await restart();

    const { body } = await rq({
      url: '/content-manager/content-types/api::article.article/configuration',
      method: 'GET',
    });

    expect(body.data.contentType.layouts.edit[0][0].name).toBe('title');
    expect(body.data.contentType.layouts.edit[0][0].size).toBe(8);

    expect(body.data.contentType.layouts.edit[0][1].name).toBe('date');
    expect(body.data.contentType.layouts.edit[0][1].size).toBe(4);

    expect(body.data.contentType.layouts.edit[2][0].name).toBe('jsonField');
    expect(body.data.contentType.layouts.edit[2][0].size).toBe(12);
  });

  test('Update field size with server restart and invalid date size', async () => {
    const payload = [...FIXTURE_DEFAULT_LAYOUT];
    payload[0][0].size = 12; // title
    payload[0][1].size = 14; // date

    await rq({
      url: '/content-manager/content-types/api::article.article/configuration',
      method: 'PUT',
      body: {
        layouts: {
          edit: payload,
          editRelations: [],
          list: [],
        },
      },
    });

    await restart();

    const { body } = await rq({
      url: '/content-manager/content-types/api::article.article/configuration',
      method: 'GET',
    });

    expect(body.data.contentType.layouts.edit[0][0].name).toBe('title');
    expect(body.data.contentType.layouts.edit[0][0].size).toBe(12);

    expect(body.data.contentType.layouts.edit[2][0].name).toBe('date');
    expect(body.data.contentType.layouts.edit[2][0].size).toBe(4);
  });
});
