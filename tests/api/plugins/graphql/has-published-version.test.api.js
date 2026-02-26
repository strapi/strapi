'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;
let graphqlQuery;

const articleModel = {
  attributes: {
    title: {
      type: 'string',
    },
  },
  draftAndPublish: true,
  singularName: 'article',
  pluralName: 'articles',
  displayName: 'Article',
  description: '',
  collectionName: '',
};

const categoryModel = {
  attributes: {
    name: {
      type: 'string',
    },
    articles: {
      type: 'relation',
      relation: 'manyToMany',
      target: 'api::article.article',
      targetAttribute: 'categories',
    },
  },
  draftAndPublish: true,
  singularName: 'category',
  pluralName: 'categories',
  displayName: 'Category',
  description: '',
  collectionName: '',
};

// category-1: has both draft and published versions
// category-2: draft only (never published)
const categories = [
  { name: 'Category 1', documentId: 'category-1', publishedAt: null },
  { name: 'Category 1', documentId: 'category-1', publishedAt: new Date() },
  { name: 'Category 2', documentId: 'category-2', publishedAt: null },
];

// article-1: draft only (never published), linked to both categories
// article-2: has both draft and published versions, linked to both categories
const articles = ({ category: categoryFixtures }) => {
  const categoryIds = categoryFixtures.map((c) => c.id);

  return [
    { title: 'Article 1', documentId: 'article-1', publishedAt: null, categories: categoryIds },
    { title: 'Article 2', documentId: 'article-2', publishedAt: null, categories: categoryIds },
    {
      title: 'Article 2',
      documentId: 'article-2',
      publishedAt: new Date(),
      categories: categoryIds,
    },
  ];
};

describe('Test Graphql hasPublishedVersion filter', () => {
  beforeAll(async () => {
    await builder
      .addContentType(articleModel)
      .addContentType(categoryModel)
      .addFixtures(categoryModel.singularName, categories)
      .addFixtures(articleModel.singularName, articles)
      .build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    graphqlQuery = (body) => {
      return rq({
        url: '/graphql',
        method: 'POST',
        body,
      });
    };
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('hasPublishedVersion: false returns only never-published drafts', async () => {
    const res = await graphqlQuery({
      query: /* GraphQL */ `
        {
          articles(status: DRAFT, hasPublishedVersion: false) {
            documentId
            title
          }
        }
      `,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.articles).toHaveLength(1);
    expect(res.body.data.articles[0].documentId).toBe('article-1');
    expect(res.body.data.articles[0].title).toBe('Article 1');
  });

  test('hasPublishedVersion: true returns only drafts that have a published version', async () => {
    const res = await graphqlQuery({
      query: /* GraphQL */ `
        {
          articles(status: DRAFT, hasPublishedVersion: true) {
            documentId
            title
          }
        }
      `,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.articles).toHaveLength(1);
    expect(res.body.data.articles[0].documentId).toBe('article-2');
    expect(res.body.data.articles[0].title).toBe('Article 2');
  });

  test('Omitting hasPublishedVersion returns all drafts', async () => {
    const res = await graphqlQuery({
      query: /* GraphQL */ `
        {
          articles(status: DRAFT) {
            documentId
            title
          }
        }
      `,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.articles).toHaveLength(2);

    const documentIds = res.body.data.articles.map((a) => a.documentId).sort();
    expect(documentIds).toEqual(['article-1', 'article-2']);
  });

  test('hasPublishedVersion works with _connection query', async () => {
    const res = await graphqlQuery({
      query: /* GraphQL */ `
        {
          articles_connection(status: DRAFT, hasPublishedVersion: false) {
            nodes {
              documentId
              title
            }
            pageInfo {
              total
            }
          }
        }
      `,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.articles_connection.nodes).toHaveLength(1);
    expect(res.body.data.articles_connection.nodes[0].documentId).toBe('article-1');
    expect(res.body.data.articles_connection.pageInfo.total).toBe(1);
  });

  test('hasPublishedVersion: true cascades into populated relations', async () => {
    const res = await graphqlQuery({
      query: /* GraphQL */ `
        {
          articles(status: DRAFT, hasPublishedVersion: true) {
            documentId
            categories {
              name
            }
          }
        }
      `,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.articles).toHaveLength(1);
    expect(res.body.data.articles[0].documentId).toBe('article-2');
    expect(res.body.data.articles[0].categories).toEqual([{ name: 'Category 1' }]);
  });

  test('hasPublishedVersion: false cascades into populated relations', async () => {
    const res = await graphqlQuery({
      query: /* GraphQL */ `
        {
          articles(status: DRAFT, hasPublishedVersion: false) {
            documentId
            categories {
              name
            }
          }
        }
      `,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.articles).toHaveLength(1);
    expect(res.body.data.articles[0].documentId).toBe('article-1');
    expect(res.body.data.articles[0].categories).toEqual([{ name: 'Category 2' }]);
  });

  test('filters and hasPublishedVersion work together in the same query', async () => {
    const res = await graphqlQuery({
      query: /* GraphQL */ `
        {
          articles_connection(
            status: DRAFT
            hasPublishedVersion: false
            filters: { title: { eq: "Article 1" } }
          ) {
            nodes {
              documentId
              title
            }
            pageInfo {
              total
            }
          }
        }
      `,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.articles_connection.nodes).toHaveLength(1);
    expect(res.body.data.articles_connection.nodes[0].documentId).toBe('article-1');
    expect(res.body.data.articles_connection.nodes[0].title).toBe('Article 1');
    expect(res.body.data.articles_connection.pageInfo.total).toBe(1);
  });
});
