'use strict';

/**
 * GraphQL collection-type manyToMany relation order with pagination (issue #26577).
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
      mappedBy: 'categories',
    },
  },
};

const articleModel = {
  kind: 'collectionType',
  collectionName: 'articles',
  singularName: 'article',
  pluralName: 'articles',
  displayName: 'Article',
  draftAndPublish: true,
  attributes: {
    title: { type: 'string' },
    categories: {
      type: 'relation',
      relation: 'manyToMany',
      target: 'api::category.category',
      inversedBy: 'articles',
    },
  },
};

describe('GraphQL collection relation order (issue #26577)', () => {
  let articleDocumentId;
  const categoryIds = [];

  beforeAll(async () => {
    await builder.addContentTypes([categoryModel, articleModel]).build();

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
    const names = categories.map((item) => item.name ?? item.attributes?.name);

    expect(names).toEqual(['Gamma', 'Alpha', 'Beta']);
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
    const names = nodes.map((item) => item.name ?? item.attributes?.name);

    expect(names).toEqual(['Gamma', 'Alpha', 'Beta']);
  });
});
