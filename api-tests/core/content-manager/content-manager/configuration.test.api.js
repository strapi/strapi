'use strict';

// Helpers.
const { set } = require('lodash/fp');
const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const form = require('api-tests/generators');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;

const restart = async () => {
  await strapi.destroy();
  strapi = await createStrapiInstance();
  rq = await createAuthRequest({ strapi });
};

// Set a new attribute to form.article
const ct = set('attributes.nonVisible', {
  type: 'string',
  visible: false,
  writable: true,
})(form.article);

describe('Content Manager - Configuration', () => {
  beforeAll(async () => {
    await builder.addContentTypes([ct]).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('List and edit layout cannot be empty', async () => {
    await rq({
      url: '/content-manager/content-types/api::article.article/configuration',
      method: 'PUT',
      body: {
        layouts: {
          edit: [],
          list: [],
        },
      },
    });

    await restart();

    const { body } = await rq({
      url: '/content-manager/content-types/api::article.article/configuration',
      method: 'GET',
    });

    expect(body.data.contentType.layouts.edit).toStrictEqual([
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
      [
        {
          name: 'author',
          size: 6,
        },
      ],
    ]);
    expect(body.data.contentType.layouts.list).toStrictEqual(['id', 'title', 'date', 'author']);
  });

  test('Update list and edit layout (with relation)', async () => {
    await rq({
      url: '/content-manager/content-types/api::article.article/configuration',
      method: 'PUT',
      body: {
        layouts: {
          edit: [
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
                name: 'author',
                size: 6,
              },
            ],
          ],
          list: ['id', 'title', 'author'],
        },
      },
    });

    await restart();

    const { body } = await rq({
      url: '/content-manager/content-types/api::article.article/configuration',
      method: 'GET',
    });
    expect(body.data.contentType.layouts.edit).toStrictEqual([
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
          name: 'author',
          size: 6,
        },
      ],
    ]);
    expect(body.data.contentType.layouts.list).toStrictEqual(['id', 'title', 'author']);
  });

  test('Set non visible attribute as default sort', async () => {
    // Get current config
    const { body } = await rq({
      url: '/content-manager/content-types/api::article.article/configuration',
      method: 'GET',
    });

    // set default sort
    const configuration = set('contentType.settings.defaultSortBy', 'nonVisible', body.data);

    const res = await rq({
      url: '/content-manager/content-types/api::article.article/configuration',
      method: 'PUT',
      body: { settings: configuration.contentType.settings },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.contentType.settings.defaultSortBy).toBe('nonVisible');
  });

  test('Set relational attribute as default sort', async () => {
    // Get current config
    const { body } = await rq({
      url: '/content-manager/content-types/api::article.article/configuration',
      method: 'GET',
    });

    // set default sort
    const configuration = set('contentType.settings.defaultSortBy', 'author[username]', body.data);

    const res = await rq({
      url: '/content-manager/content-types/api::article.article/configuration',
      method: 'PUT',
      body: { settings: configuration.contentType.settings },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.contentType.settings.defaultSortBy).toBe('author[username]');
  });
});
