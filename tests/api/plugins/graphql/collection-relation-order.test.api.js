'use strict';

/**
 * GraphQL collection-type manyToMany relation order with pagination (issue #26577).
 *
 * GraphQL SortArg defaults to `[]`; meaningless sort must not override join-table connect order.
 * Explicit meaningful sort must still win (no breaking change).
 */
const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;
let graphqlQuery;

const categoryModel = {
  kind: 'collectionType',
  collectionName: 'categories',
  singularName: 'category',
  pluralName: 'categories',
  displayName: 'Category',
  attributes: {
    name: { type: 'string' },
    articles: {
      type: 'relation',
      relation: 'manyToMany',
      target: 'api::article.article',
      targetAttribute: 'categories',
    },
  },
};

const articleModel = {
  kind: 'collectionType',
  collectionName: 'articles',
  singularName: 'article',
  pluralName: 'articles',
  displayName: 'Article',
  attributes: {
    title: { type: 'string' },
  },
};

const CONNECT_ORDER = ['Gamma', 'Alpha', 'Beta'];

const categoryNamesFromList = (items) => items.map((item) => item.name ?? item.attributes?.name);

describe('GraphQL collection relation order (issue #26577)', () => {
  let articleDocumentId;
  const categoryIds = [];

  beforeAll(async () => {
    await builder.addContentTypes([articleModel, categoryModel]).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    graphqlQuery = (body) =>
      rq({
        url: '/graphql',
        method: 'POST',
        body,
      });

    for (const name of ['Alpha', 'Beta', 'Gamma']) {
      const category = await strapi.documents('api::category.category').create({
        data: { name },
      });
      categoryIds.push(category.documentId);
    }

    const article = await strapi.documents('api::article.article').create({
      data: {
        title: 'Order test article',
        categories: [categoryIds[2], categoryIds[0], categoryIds[1]],
      },
      populate: { categories: true },
    });

    articleDocumentId = article.documentId;
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('returns manyToMany relations in connect order without pagination', async () => {
    const res = await graphqlQuery({
      query: /* GraphQL */ `
        query ($documentId: ID!) {
          article(documentId: $documentId) {
            data {
              attributes {
                categories {
                  name
                }
              }
            }
          }
        }
      `,
      variables: { documentId: articleDocumentId },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const categories = res.body.data.article.data.attributes.categories;

    expect(categoryNamesFromList(categories)).toEqual(CONNECT_ORDER);
  });

  test('returns manyToMany relations in connect order with pagination', async () => {
    const res = await graphqlQuery({
      query: /* GraphQL */ `
        query ($documentId: ID!) {
          article(documentId: $documentId) {
            data {
              attributes {
                categories(pagination: { page: 1, pageSize: 10 }) {
                  name
                }
              }
            }
          }
        }
      `,
      variables: { documentId: articleDocumentId },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const categories = res.body.data.article.data.attributes.categories;

    expect(categoryNamesFromList(categories)).toEqual(CONNECT_ORDER);
  });

  test('returns manyToMany relations in connect order when sort is explicitly empty with pagination', async () => {
    const res = await graphqlQuery({
      query: /* GraphQL */ `
        query ($documentId: ID!) {
          article(documentId: $documentId) {
            data {
              attributes {
                categories(sort: [], pagination: { page: 1, pageSize: 10 }) {
                  name
                }
              }
            }
          }
        }
      `,
      variables: { documentId: articleDocumentId },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const categories = res.body.data.article.data.attributes.categories;

    expect(categoryNamesFromList(categories)).toEqual(CONNECT_ORDER);
  });

  test('returns manyToMany relations in connect order via _connection with pagination', async () => {
    const res = await graphqlQuery({
      query: /* GraphQL */ `
        query ($documentId: ID!) {
          article(documentId: $documentId) {
            data {
              attributes {
                categories_connection(pagination: { page: 1, pageSize: 10 }) {
                  nodes {
                    name
                  }
                }
              }
            }
          }
        }
      `,
      variables: { documentId: articleDocumentId },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const nodes = res.body.data.article.data.attributes.categories_connection.nodes;

    expect(categoryNamesFromList(nodes)).toEqual(CONNECT_ORDER);
  });

  test('paginates manyToMany relations in connect order across pages', async () => {
    const page1 = await graphqlQuery({
      query: /* GraphQL */ `
        query ($documentId: ID!) {
          article(documentId: $documentId) {
            data {
              attributes {
                categories(pagination: { page: 1, pageSize: 2 }) {
                  name
                }
              }
            }
          }
        }
      `,
      variables: { documentId: articleDocumentId },
    });

    const page2 = await graphqlQuery({
      query: /* GraphQL */ `
        query ($documentId: ID!) {
          article(documentId: $documentId) {
            data {
              attributes {
                categories(pagination: { page: 2, pageSize: 2 }) {
                  name
                }
              }
            }
          }
        }
      `,
      variables: { documentId: articleDocumentId },
    });

    expect(page1.statusCode).toBe(200);
    expect(page1.body.errors).toBeUndefined();
    expect(page2.statusCode).toBe(200);
    expect(page2.body.errors).toBeUndefined();

    const page1Names = categoryNamesFromList(page1.body.data.article.data.attributes.categories);
    const page2Names = categoryNamesFromList(page2.body.data.article.data.attributes.categories);

    expect(page1Names).toEqual(['Gamma', 'Alpha']);
    expect(page2Names).toEqual(['Beta']);
    expect([...page1Names, ...page2Names]).toEqual(CONNECT_ORDER);
  });

  test('applies explicit sort on manyToMany relations with pagination', async () => {
    const res = await graphqlQuery({
      query: /* GraphQL */ `
        query ($documentId: ID!) {
          article(documentId: $documentId) {
            data {
              attributes {
                categories(sort: ["name:asc"], pagination: { page: 1, pageSize: 10 }) {
                  name
                }
              }
            }
          }
        }
      `,
      variables: { documentId: articleDocumentId },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const categories = res.body.data.article.data.attributes.categories;

    expect(categoryNamesFromList(categories)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  test('applies explicit descending sort on manyToMany relations with pagination', async () => {
    const res = await graphqlQuery({
      query: /* GraphQL */ `
        query ($documentId: ID!) {
          article(documentId: $documentId) {
            data {
              attributes {
                categories(sort: ["name:desc"], pagination: { page: 1, pageSize: 10 }) {
                  name
                }
              }
            }
          }
        }
      `,
      variables: { documentId: articleDocumentId },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const categories = res.body.data.article.data.attributes.categories;

    expect(categoryNamesFromList(categories)).toEqual(['Gamma', 'Beta', 'Alpha']);
  });
});
