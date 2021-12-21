'use strict';

const { createStrapiInstance } = require('../../../../../test/helpers/strapi');
const {
  createContentAPIRequest,
  transformToRESTResource,
} = require('../../../../../test/helpers/request');
const { createTestBuilder } = require('../../../../../test/helpers/builder');

let strapi;
let rq;

const categoryModel = {
  kind: 'collectionType',
  collectionName: 'categories',
  displayName: 'Category',
  singularName: 'category',
  pluralName: 'categories',
  description: '',
  name: 'Category',
  options: {
    draftAndPublish: false,
  },
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  attributes: {
    name: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
  },
};

const homepageModel = {
  kind: 'singleType',
  collectionName: 'homepages',
  displayName: 'Homepage',
  singularName: 'homepage',
  pluralName: 'homepages',
  options: {
    draftAndPublish: false,
  },
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  attributes: {
    title: {
      type: 'string',
      required: true,
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
  },
};

const homepages = [
  {
    title: 'homepage title',
    locale: 'en',
  },
  {
    title: '홈페이지 제목',
    locale: 'ko',
  },
];

const categories = [
  {
    name: 'post',
    locale: 'en',
  },
  {
    name: '게시물',
    locale: 'ko',
  },
];

const data = {};

describe('i18n - Content API', () => {
  const builder = createTestBuilder();

  beforeAll(async () => {
    await builder
      .addContentTypes([homepageModel, categoryModel])
      .addFixtures('plugin::i18n.locale', [
        {
          name: 'Ko',
          code: 'ko',
        },
      ])
      .addFixtures(homepageModel.singularName, homepages)
      .addFixtures(categoryModel.singularName, categories)
      .build();

    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });

    data.homepages = await builder.sanitizedFixturesFor(homepageModel.singularName, strapi);
    data.categories = await builder.sanitizedFixturesFor(categoryModel.singularName, strapi);
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Test collection type', () => {
    test('Filter using the default locale when no parameter is specified', async () => {
      const res = await rq({
        method: 'GET',
        url: '/categories',
      });

      const { statusCode, body } = res;

      expect(statusCode).toBe(200);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0]).toMatchObject(transformToRESTResource(data.categories[0]));
    });

    test('Can filter on any locale', async () => {
      const res = await rq({
        method: 'GET',
        url: '/categories?locale=ko',
      });

      const { statusCode, body } = res;

      expect(statusCode).toBe(200);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0]).toMatchObject(transformToRESTResource(data.categories[1]));
    });

    test('Can filter on all locale', async () => {
      const res = await rq({
        method: 'GET',
        url: '/categories?locale=all',
      });

      const { statusCode, body } = res;

      expect(statusCode).toBe(200);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data).toHaveLength(2);
      expect(body.data).toEqual(
        expect.arrayContaining(data.categories.map(category => transformToRESTResource(category)))
      );
    });
  });

  describe('Test single type', () => {
    test('Filter using the default locale when no parameter is specified', async () => {
      const res = await rq({
        method: 'GET',
        url: '/homepage',
      });

      const { statusCode, body } = res;

      expect(statusCode).toBe(200);
      expect(body.data).toMatchObject(transformToRESTResource(data.homepages[0]));
    });

    test('Can filter on any locale', async () => {
      const res = await rq({
        method: 'GET',
        url: '/homepage?locale=ko',
      });

      const { statusCode, body } = res;

      expect(statusCode).toBe(200);
      expect(body.data).toMatchObject(transformToRESTResource(data.homepages[1]));
    });

    test('Can filter on all locale', async () => {
      const res = await rq({
        method: 'GET',
        url: '/homepage?locale=all',
      });

      const { statusCode, body } = res;

      expect(statusCode).toBe(200);
      expect(body.data).toMatchObject(transformToRESTResource(data.homepages[0]));
    });
  });
});
