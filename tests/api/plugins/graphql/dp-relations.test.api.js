'use strict';

// Helpers.
const { pick } = require('lodash/fp');
const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;
let graphqlQuery;

// Utils
const selectFields = pick(['name']);

const articleModel = {
  attributes: {
    name: {
      type: 'richtext',
    },
  },
  draftAndPublish: true,
  singularName: 'article',
  pluralName: 'articles',
  displayName: 'Article',
  description: '',
  collectionName: '',
};

const labelModel = {
  attributes: {
    name: {
      type: 'richtext',
    },
    articles: {
      type: 'relation',
      relation: 'manyToMany',
      target: 'api::article.article',
      targetAttribute: 'labels',
    },
  },
  draftAndPublish: true,
  singularName: 'label',
  pluralName: 'labels',
  displayName: 'Label',
  description: '',
  collectionName: '',
};

const labels = [{ name: 'label 1' }, { name: 'label 2' }];

const articles = ({ label: labels }) => {
  const labelIds = labels.map((label) => label.id);
  return [
    { name: 'article 1', documentId: 'article-1', publishedAt: new Date(), labels: labelIds },
    { name: 'article 1', documentId: 'article-1', publishedAt: null, labels: labelIds },
    { name: 'article 2', documentId: 'article-2', publishedAt: new Date(), labels: labelIds },
    { name: 'article 2', documentId: 'article-2', publishedAt: null, labels: labelIds },
  ];
};

describe('Test Graphql Relations with Draft and Publish enabled', () => {
  const data = {
    labels: [],
    articles: [],
  };

  beforeAll(async () => {
    await builder
      .addContentTypes([articleModel, labelModel])
      .addFixtures(labelModel.singularName, labels)
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

  describe('Test relations features', () => {
    test('List labels', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            labels_connection {
              data {
                documentId
                attributes {
                  name
                }
              }
            }
          }
        `,
      });

      const { body } = res;

      expect(res.statusCode).toBe(200);
      expect(body).toMatchObject({
        data: {
          labels_connection: {
            data: labels.map((label) => ({
              documentId: expect.any(String),
              attributes: pick('name', label),
            })),
          },
        },
      });

      // assign for later use
      data.labels = data.labels.concat(res.body.data.labels_connection.data);
    });

    test('List preview articles with labels', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            articles_connection(status: DRAFT) {
              data {
                documentId
                attributes {
                  name
                  labels {
                    data {
                      documentId
                      attributes {
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        `,
      });

      const { body } = res;

      expect(res.statusCode).toBe(200);
      expect(body).toMatchObject({
        data: {
          articles_connection: {
            data: expect.arrayContaining(data.articles),
          },
        },
      });

      // assign for later use
      data.articles = res.body.data.articles_connection.data;
    });

    test('Publish article', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          mutation publishArticle($documentId: ID!, $data: ArticleInput!) {
            updateArticle(documentId: $documentId, data: $data, status: PUBLISHED) {
              data {
                documentId
                attributes {
                  name
                  publishedAt
                }
              }
            }
          }
        `,
        variables: {
          documentId: data.articles[0].documentId,
          data: {},
        },
      });

      const { body } = res;

      expect(res.statusCode).toBe(200);
      expect(body).toMatchObject({
        data: {
          updateArticle: {
            data: {
              documentId: data.articles[0].documentId,
              attributes: {
                name: data.articles[0].attributes.name,
                publishedAt: expect.any(String),
              },
            },
          },
        },
      });
    });

    test('List labels with live articles', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            labels_connection {
              data {
                documentId
                attributes {
                  name
                  articles_connection {
                    data {
                      documentId
                      attributes {
                        name
                        publishedAt
                      }
                    }
                  }
                }
              }
            }
          }
        `,
      });

      const { body } = res;

      expect(res.statusCode).toBe(200);
      expect(body).toMatchObject({
        data: {
          labels_connection: {
            data: expect.arrayContaining(
              data.labels.map((label) => ({
                documentId: label.documentId,
                attributes: {
                  ...label.attributes,
                  articles_connection: {
                    data: expect.arrayContaining(
                      // Only the first article is published
                      data.articles.slice(0, 1).map((article) => ({
                        documentId: article.documentId,
                        attributes: {
                          ...selectFields(article.attributes),
                          publishedAt: expect.any(String),
                        },
                      }))
                    ),
                  },
                },
              }))
            ),
          },
        },
      });
    });

    test('List labels with preview articles', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            labels_connection {
              data {
                documentId
                attributes {
                  name
                  articles_connection {
                    data {
                      documentId
                      attributes {
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        `,
      });

      const { body } = res;

      expect(res.statusCode).toBe(200);
      expect(body).toMatchObject({
        data: {
          labels_connection: {
            data: expect.arrayContaining(
              data.labels.map((label) => ({
                documentId: label.documentId,
                attributes: {
                  ...label.attributes,
                  articles_connection: {
                    data: expect.arrayContaining(
                      // All articles should be returned, even if they are not published
                      data.articles.map((article) => ({
                        documentId: article.documentId,
                        attributes: selectFields(article.attributes),
                      }))
                    ),
                  },
                },
              }))
            ),
          },
        },
      });
    });
  });
});
