'use strict';

const { propEq, omit } = require('lodash/fp');

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createContentAPIRequest } = require('api-tests/request');

const builder = createTestBuilder();

let strapi;
let data;
let rq;

const cat = (letter) => {
  const found = data.category.find((c) => c.name.toLowerCase().endsWith(letter));
  const { id, ...attributes } = found;
  return {
    id,
    attributes,
  };
};

const schemas = {
  contentTypes: {
    category: {
      attributes: {
        name: {
          type: 'string',
        },
      },
      displayName: 'Categories',
      singularName: 'category',
      pluralName: 'categories',
      description: '',
      collectionName: '',
    },
    article: {
      attributes: {
        title: {
          type: 'string',
        },
        categories: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::category.category',
        },
        primary: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'api::category.category',
        },
        relatedArticles: {
          type: 'relation',
          relation: 'manyToMany',
          target: 'api::article.article',
        },
      },
      displayName: 'Article',
      singularName: 'article',
      pluralName: 'articles',
      description: '',
      collectionName: '',
    },
  },
};

const fixtures = {
  category: [
    {
      name: 'Category A',
    },
    {
      name: 'Category C',
    },
    {
      name: 'Category B',
    },
    {
      name: 'Category D',
    },
  ],
  articles: (fixtures) => {
    return [
      {
        title: 'Article A',
        categories: fixtures.category
          .filter((cat) => cat.name.endsWith('B') || cat.name.endsWith('A'))
          .map((cat) => cat.id),
      },

      {
        title: 'Article C',
        categories: fixtures.category
          .filter((cat) => cat.name.endsWith('D') || cat.name.endsWith('A'))
          .map((cat) => cat.id),
      },
      {
        title: 'Article D',
        categories: fixtures.category.filter((cat) => cat.name.endsWith('B')).map((cat) => cat.id),
      },
      {
        title: 'Article B',
        categories: fixtures.category.filter((cat) => cat.name.endsWith('A')).map((cat) => cat.id),
      },
    ];
  },
};

describe('Sort', () => {
  beforeAll(async () => {
    await builder
      .addContentTypes(Object.values(schemas.contentTypes))
      .addFixtures(schemas.contentTypes.category.singularName, fixtures.category)
      .addFixtures(schemas.contentTypes.article.singularName, fixtures.articles)
      .build();

    strapi = await createStrapiInstance();
    rq = createContentAPIRequest({ strapi });
    data = await builder.sanitizedFixtures(strapi);
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('targeting an attribute in a relation', async () => {
    const { status, body } = await rq.get(`/${schemas.contentTypes.article.pluralName}`, {
      qs: {
        sort: 'categories.id',
        populate: 'categories',
      },
    });

    expect(status).toBe(200);
    expect(body.data.length).toBe(4);

    // TODO: some dbs might not return categories data sorted by id, this should be arrayContaining+objectMatching
    expect(body.data).toMatchObject([
      {
        id: 1,
        attributes: {
          title: 'Article A',
          categories: {
            data: [cat('a'), cat('b')],
          },
        },
      },
      {
        id: 2,
        attributes: {
          title: 'Article C',
          categories: {
            data: [cat('a'), cat('d')],
          },
        },
      },
      {
        id: 4,
        attributes: {
          title: 'Article B',
          categories: {
            data: [cat('a')],
          },
        },
      },
      {
        id: 3,
        attributes: {
          title: 'Article D',
          categories: {
            data: [cat('b')],
          },
        },
      },
    ]);

    expect(body.meta).toMatchObject({
      pagination: {
        page: 1,
        pageSize: 25,
        pageCount: 1,
        total: 4,
      },
    });
  });
});
