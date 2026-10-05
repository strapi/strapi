'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;

const article = {
  attributes: {
    title: {
      type: 'string',
    },
  },
  singularName: 'pagination-article',
  pluralName: 'pagination-articles',
  displayName: 'Pagination Article',
  description: '',
  collectionName: '',
};

const articles = [
  { title: 'Article 1' },
  { title: 'Article 2' },
  { title: 'Article 3' },
  { title: 'Article 4' },
];

const findArticles = (pagination) => {
  return rq({
    url: '/graphql',
    method: 'POST',
    body: {
      query: /* GraphQL */ `
        query FindPaginationArticles($pagination: PaginationArg) {
          paginationArticles_connection(pagination: $pagination) {
            data {
              attributes {
                title
              }
            }
            meta {
              pagination {
                page
                pageSize
                pageCount
                total
              }
            }
          }
        }
      `,
      variables: { pagination },
    },
  });
};

describe('GraphQL pagination defaults', () => {
  beforeAll(async () => {
    await builder.addContentType(article).addFixtures(article.singularName, articles).build();
  });

  afterAll(async () => {
    await builder.cleanup();
  });

  const startStrapi = async ({ defaultLimit, maxLimit }) => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
    strapi.config.set('plugin::graphql.defaultLimit', defaultLimit);
    strapi.config.set('plugin::graphql.maxLimit', maxLimit);
    expect(strapi.plugin('graphql').config('defaultLimit')).toBe(defaultLimit);
    expect(strapi.plugin('graphql').config('maxLimit')).toBe(maxLimit);
  };

  const expectSecondPage = (res) => {
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      data: {
        paginationArticles_connection: {
          data: [{ attributes: articles[2] }, { attributes: articles[3] }],
          meta: {
            pagination: {
              page: 2,
              pageSize: 2,
              pageCount: 2,
              total: 4,
            },
          },
        },
      },
    });
  };

  describe('without a maxLimit', () => {
    beforeAll(async () => {
      await startStrapi({ defaultLimit: 2, maxLimit: -1 });
    });

    afterAll(async () => {
      await strapi.destroy();
    });

    test('uses configured defaultLimit when pageSize is omitted', async () => {
      expectSecondPage(await findArticles({ page: 2 }));
    });
  });

  describe('when defaultLimit exceeds maxLimit', () => {
    beforeAll(async () => {
      await startStrapi({ defaultLimit: 3, maxLimit: 2 });
    });

    afterAll(async () => {
      await strapi.destroy();
    });

    test('uses configured defaultLimit when nullable pageSize is null', async () => {
      expectSecondPage(await findArticles({ page: 2, pageSize: null }));
    });

    test('uses capped defaultLimit to calculate the page offset', async () => {
      expectSecondPage(await findArticles({ page: 2 }));
    });
  });
});
