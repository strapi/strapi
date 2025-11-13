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
    one_to_many_articles: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'api::article.article',
      targetAttribute: 'label',
    },
    dz: {
      type: 'dynamiczone',
      components: ['default.component-with-relation'],
    },
  },
  draftAndPublish: true,
  singularName: 'label',
  pluralName: 'labels',
  displayName: 'Label',
  description: '',
  collectionName: '',
};

const componentWithOneToManyRelation = {
  displayName: 'component-with-relation',
  attributes: {
    name: {
      type: 'string',
    },
    articles: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'api::article.article',
    },
  },
};

const labels = [
  { name: 'label 1', documentId: 'label-1', publishedAt: new Date() },
  { name: 'label 1', documentId: 'label-1', publishedAt: null },
  { name: 'label 2', documentId: 'label-2', publishedAt: new Date() },
  { name: 'label 2', documentId: 'label-2', publishedAt: null },
];

const articles = ({ label: labels }) => {
  const labelIds = labels.map((label) => label.id);

  return [
    {
      name: 'article 1',
      documentId: 'article-1',
      publishedAt: new Date(),
      labels: labelIds,
      label: labelIds[0],
    },
    {
      name: 'article 1',
      documentId: 'article-1',
      publishedAt: null,
      labels: labelIds,
      label: labelIds[1],
    },
    {
      name: 'article 2',
      documentId: 'article-2',
      publishedAt: new Date(),
      labels: labelIds,
      label: labelIds[0],
    },
    {
      name: 'article 2',
      documentId: 'article-2',
      publishedAt: null,
      labels: labelIds,
      label: labelIds[1],
    },
  ];
};

describe('Test Graphql Relations with Draft and Publish enabled', () => {
  const data = {
    labels: [],
    articles: [],
  };

  beforeAll(async () => {
    await builder
      .addContentType(articleModel)
      .addComponent(componentWithOneToManyRelation)
      .addContentType(labelModel)
      .addFixtures(labelModel.singularName, labels)
      .addFixtures(articleModel.singularName, articles)
      .build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    // Add dynamic zones to test data
    await strapi.documents('api::label.label').update({
      documentId: 'label-1',
      data: {
        dz: [
          {
            __component: 'default.component-with-relation',
            articles: ['article-1'],
            name: 'TEST DZ',
          },
        ],
      },
    });
    await strapi.documents('api::label.label').update({
      documentId: 'label-2',
      data: {
        dz: [
          {
            __component: 'default.component-with-relation',
            articles: ['article-2'],
            name: 'TEST DZ',
          },
        ],
      },
    });
    await strapi.documents('api::label.label').publish({
      documentId: 'label-1',
    });
    await strapi.documents('api::label.label').publish({
      documentId: 'label-2',
    });

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
                  publishedAt
                }
              }
            }
          }
        `,
      });

      const { body } = res;

      expect(res.statusCode).toBe(200);
      expect(body.data.labels_connection.data.length).toBe(2);
      expect(body.data.labels_connection.data.every((label) => label.attributes.publishedAt)).toBe(
        true
      );

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
      expect(body.data.articles_connection.data.length).toBe(2);
      expect(
        body.data.articles_connection.data.every((article) => article.attributes.publishedAt)
      ).toBe(false);

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

    test('List labels with published articles', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            labels_connection {
              data {
                documentId
                attributes {
                  name
                  dz {
                    ... on ComponentDefaultComponentWithRelation {
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
                  one_to_many_articles_connection {
                    data {
                      documentId
                      attributes {
                        publishedAt
                      }
                    }
                  }
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
      // Check the manyToMany response
      expect(body.data.labels_connection.data[0].attributes.articles_connection.data.length).toBe(
        2
      );
      expect(
        body.data.labels_connection.data[0].attributes.articles_connection.data.every(
          (article) => article.attributes.publishedAt
        )
      ).toBe(true);
      // Check the oneToMany response
      expect(
        body.data.labels_connection.data[0].attributes.one_to_many_articles_connection.data.length
      ).toBe(2);
      expect(
        body.data.labels_connection.data[0].attributes.one_to_many_articles_connection.data.every(
          (article) => article.attributes.publishedAt
        )
      ).toBe(true);
      // Check dynamic zone with relations
      expect(body.data.labels_connection.data[0].attributes.dz.length).toBe(1);
      expect(
        body.data.labels_connection.data[0].attributes.dz[0].articles_connection.data.every(
          (article) => article.attributes.publishedAt
        )
      ).toBe(true);
    });

    test('List labels with draft articles', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            labels_connection(status: DRAFT) {
              data {
                documentId
                publishedAt
                attributes {
                  name
                  dz {
                    ... on ComponentDefaultComponentWithRelation {
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
                  one_to_many_articles_connection {
                    data {
                      documentId
                      attributes {
                        publishedAt
                      }
                    }
                  }
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
      // Check the manyToMany response
      expect(body.data.labels_connection.data[0].attributes.articles_connection.data.length).toBe(
        2
      );
      expect(
        body.data.labels_connection.data[0].attributes.articles_connection.data.every(
          (article) => article.attributes.publishedAt
        )
      ).toBe(false);
      // Check the oneToMany response
      expect(
        body.data.labels_connection.data[0].attributes.one_to_many_articles_connection.data.length
      ).toBe(2);
      expect(
        body.data.labels_connection.data[0].attributes.one_to_many_articles_connection.data.every(
          (article) => article.attributes.publishedAt
        )
      ).toBe(false);
      // Check dynamic zone with relations
      expect(body.data.labels_connection.data[0].attributes.dz.length).toBe(1);
      expect(
        body.data.labels_connection.data[0].attributes.dz[0].articles_connection.data.every(
          (article) => article.attributes.publishedAt
        )
      ).toBe(false);
    });
  });
});
