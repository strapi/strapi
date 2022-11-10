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

describe('Content Manager - Hide relations', () => {
  beforeAll(async () => {
    await builder.addContentTypes([form.article]).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Hide relations', async () => {
    await rq({
      url: '/content-manager/content-types/api::article.article/configuration',
      method: 'PUT',
      body: {
        layouts: {
          edit: [],
          editRelations: [],
          list: [],
        },
      },
    });

    const { body } = await rq({
      url: '/content-manager/content-types/api::article.article/configuration',
      method: 'GET',
    });

    expect(body.data.contentType.layouts.editRelations).toStrictEqual([]);
  });

  test('Hide relations after server restart', async () => {
    await rq({
      url: '/content-manager/content-types/api::article.article/configuration',
      method: 'PUT',
      body: {
        layouts: {
          edit: [],
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

    expect(body.data.contentType.layouts.editRelations).toStrictEqual([]);
  });
});
