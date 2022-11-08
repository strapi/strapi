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

describe('Content Manager - Configuration', () => {
  beforeAll(async () => {
    await builder.addContentTypes([form.article]).build();

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
});
