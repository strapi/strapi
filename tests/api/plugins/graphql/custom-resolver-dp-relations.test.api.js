'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;
let graphqlQuery;

const authorModel = {
  attributes: {
    name: { type: 'string' },
  },
  draftAndPublish: true,
  singularName: 'author',
  pluralName: 'authors',
  displayName: 'Author',
  description: '',
  collectionName: '',
};

const categoryModel = {
  attributes: {
    name: { type: 'string' },
  },
  draftAndPublish: false,
  singularName: 'category',
  pluralName: 'categories',
  displayName: 'Category',
  description: '',
  collectionName: '',
};

const articleModel = {
  attributes: {
    title: { type: 'string' },
    author: {
      type: 'relation',
      relation: 'manyToOne',
      target: 'api::author.author',
    },
    category: {
      type: 'relation',
      relation: 'manyToOne',
      target: 'api::category.category',
    },
  },
  draftAndPublish: true,
  singularName: 'article',
  pluralName: 'articles',
  displayName: 'Article',
  description: '',
  collectionName: '',
};

describe('Test Graphql custom resolvers returning Document Service results', () => {
  const data = { article: null };

  beforeAll(async () => {
    await builder
      .addContentType(authorModel)
      .addContentType(categoryModel)
      .addContentType(articleModel)
      .build();

    strapi = await createStrapiInstance({
      bootstrap({ strapi: instance }) {
        instance
          .plugin('graphql')
          .service('extension')
          .use({
            typeDefs: /* GraphQL */ `
              type ArticleResponse {
                data: [Article]
              }
              type Query {
                articleByDocumentId(documentId: ID!): Article
                allArticles: ArticleResponse
              }
            `,
            resolvers: {
              Query: {
                async articleByDocumentId(_parent, args) {
                  return instance
                    .documents('api::article.article')
                    .findFirst({ filters: { documentId: args.documentId } });
                },
                async allArticles() {
                  const articleData = await instance
                    .documents('api::article.article')
                    .findMany({ populate: { author: true, category: true } });
                  return { data: articleData };
                },
              },
            },
          });
      },
    });
    rq = await createAuthRequest({ strapi });

    graphqlQuery = (body) => rq({ url: '/graphql', method: 'POST', body });

    const author = await strapi.documents('api::author.author').create({
      data: { name: 'Alice' },
    });
    await strapi.documents('api::author.author').publish({ documentId: author.documentId });

    const category = await strapi.documents('api::category.category').create({
      data: { name: 'News' },
    });

    const article = await strapi.documents('api::article.article').create({
      data: { title: 'Hello', author: author.documentId, category: category.documentId },
    });
    await strapi.documents('api::article.article').publish({ documentId: article.documentId });

    data.article = article;
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Built-in single query resolves the draft-and-publish relation (control)', async () => {
    const res = await graphqlQuery({
      query: /* GraphQL */ `
        query Article($documentId: ID!) {
          article(documentId: $documentId) {
            documentId
            title
            author {
              documentId
              name
            }
            category {
              documentId
              name
            }
          }
        }
      `,
      variables: { documentId: data.article.documentId },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.article.author).not.toBeNull();
    expect(res.body.data.article.category).not.toBeNull();
  });

  test('Custom resolver returning a findFirst() result resolves the draft-and-publish relation', async () => {
    const res = await graphqlQuery({
      query: /* GraphQL */ `
        query Article($documentId: ID!) {
          articleByDocumentId(documentId: $documentId) {
            documentId
            title
            author {
              documentId
              name
            }
            category {
              documentId
              name
            }
          }
        }
      `,
      variables: { documentId: data.article.documentId },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.articleByDocumentId.category).not.toBeNull();
    expect(res.body.data.articleByDocumentId.author).not.toBeNull();
  });

  test('Custom resolver returning a findMany() result with explicit populate resolves the draft-and-publish relation', async () => {
    const res = await graphqlQuery({
      query: /* GraphQL */ `
        {
          allArticles {
            data {
              documentId
              title
              author {
                documentId
                name
              }
              category {
                documentId
                name
              }
            }
          }
        }
      `,
    });

    expect(res.statusCode).toBe(200);
    const article = res.body.data.allArticles.data.find(
      (a) => a.documentId === data.article.documentId
    );
    expect(article.category).not.toBeNull();
    expect(article.author).not.toBeNull();
  });
});
