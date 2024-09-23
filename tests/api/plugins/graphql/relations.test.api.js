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
const selectFields = pick(['name', 'color']);

const rgbColorComponent = {
  attributes: {
    name: {
      type: 'text',
    },
    red: {
      type: 'integer',
    },
    green: {
      type: 'integer',
    },
    blue: {
      type: 'integer',
    },
  },
  displayName: 'rgbColor',
};

const articleModel = {
  attributes: {
    name: {
      type: 'richtext',
    },
    content: {
      type: 'richtext',
    },
  },
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
    color: {
      type: 'component',
      component: 'default.rgb-color',
      repeatable: false,
    },
  },
  singularName: 'label',
  pluralName: 'labels',
  displayName: 'Label',
  description: '',
  collectionName: '',
};

const carModel = {
  attributes: {
    name: {
      type: 'text',
    },
  },
  singularName: 'car',
  pluralName: 'cars',
  displayName: 'Car',
  description: '',
  collectionName: '',
};

const personModel = {
  attributes: {
    name: {
      type: 'text',
    },
    privateName: {
      type: 'text',
      private: true,
    },
    privateCars: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'api::car.car',
      targetAttribute: 'person',
      private: true,
    },
  },
  displayName: 'Person',
  singularName: 'person',
  pluralName: 'people',
  description: '',
  collectionName: '',
};

describe('Test Graphql Relations API End to End', () => {
  beforeAll(async () => {
    await builder
      .addComponent(rgbColorComponent)
      .addContentTypes([articleModel, labelModel, carModel, personModel])
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
    const data = {
      labels: [],
      articles: [],
      people: [],
      cars: [],
    };
    const labelsPayload = [
      { name: 'label 1', color: null },
      { name: 'label 2', color: null },
      { name: 'labelWithColor', color: { name: 'tomato', red: 255, green: 99, blue: 71 } },
    ];
    const articlesPayload = [{ name: 'article 1' }, { name: 'article 2' }];

    test.each(labelsPayload)('Create label %o', async (label) => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          mutation createLabel($data: LabelInput!) {
            createLabel(data: $data) {
              data {
                attributes {
                  name
                  color {
                    name
                    red
                    green
                    blue
                  }
                }
              }
            }
          }
        `,
        variables: {
          data: label,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        data: {
          createLabel: {
            data: {
              attributes: label,
            },
          },
        },
      });
    });

    test('List labels', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            labels_connection {
              data {
                documentId
                attributes {
                  name
                  color {
                    name
                    red
                    green
                    blue
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
            data: labelsPayload.map((label) => ({
              documentId: expect.any(String),
              attributes: label,
            })),
          },
        },
      });

      // assign for later use
      data.labels = data.labels.concat(res.body.data.labels_connection.data);
    });

    test.each(articlesPayload)('Create article linked to every labels %o', async (article) => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          mutation createArticle($data: ArticleInput!) {
            createArticle(data: $data) {
              data {
                documentId
                attributes {
                  name
                  labels_connection {
                    data {
                      documentId
                      attributes {
                        name
                        color {
                          name
                          red
                          green
                          blue
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `,
        variables: {
          data: {
            ...article,
            labels: data.labels.map((t) => t.documentId),
          },
        },
      });

      const { body } = res;

      expect(res.statusCode).toBe(200);

      expect(body).toMatchObject({
        data: {
          createArticle: {
            data: {
              documentId: expect.any(String),
              attributes: {
                ...selectFields(article),
                labels_connection: {
                  data: expect.arrayContaining(data.labels),
                },
              },
            },
          },
        },
      });

      data.articles.push(body.data.createArticle.data);
    });

    test('List articles with labels', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            articles_connection {
              data {
                documentId
                attributes {
                  name
                  labels_connection {
                    data {
                      documentId
                      attributes {
                        name
                        color {
                          name
                          red
                          green
                          blue
                        }
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

    test('List Labels with articles', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            labels_connection {
              data {
                documentId
                attributes {
                  name
                  color {
                    name
                    red
                    green
                    blue
                  }
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

      // assign for later use
      data.labels = res.body.data.labels_connection.data;
    });

    test('List labels with articles paginated', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          query labels($pagination: PaginationArg!) {
            labels_connection {
              data {
                documentId
                attributes {
                  name
                  color {
                    name
                    red
                    green
                    blue
                  }
                  articles_connection(pagination: $pagination) {
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
        variables: {
          pagination: {
            page: 1,
            pageSize: 1,
          },
        },
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
                      data.articles.slice(0, 1).map((article) => ({
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

      // assign for later use
      data.labels = res.body.data.labels_connection.data;
    });

    test('Deep query', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            articles_connection(filters: { labels: { name: { contains: "label 1" } } }) {
              data {
                documentId
                attributes {
                  name
                  labels_connection {
                    data {
                      documentId
                      attributes {
                        name
                        color {
                          name
                          red
                          green
                          blue
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        data: {
          articles_connection: {
            data: expect.arrayContaining(data.articles),
          },
        },
      });
    });

    test('Deep query with empty object param', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            articles_connection(filters: { labels: { name: {} } }) {
              data {
                documentId
                attributes {
                  name
                  labels_connection {
                    data {
                      documentId
                      attributes {
                        name
                        color {
                          name
                          red
                          green
                          blue
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        data: {
          articles_connection: {
            data: expect.arrayContaining(data.articles),
          },
        },
      });
    });

    test('Update Article relations removes correctly a relation', async () => {
      const article = data.articles[0];
      const labels = [data.labels[0]];

      // if I remove a label from an article is it working
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          mutation updateArticle($documentId: ID!, $data: ArticleInput!) {
            updateArticle(documentId: $documentId, data: $data) {
              data {
                documentId
                attributes {
                  name
                  labels_connection {
                    data {
                      documentId
                      attributes {
                        name
                        color {
                          name
                          red
                          green
                          blue
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `,
        variables: {
          documentId: article.documentId,
          data: {
            labels: labels.map((label) => label.documentId),
          },
        },
      });

      expect(res.body).toMatchObject({
        data: {
          updateArticle: {
            data: {
              documentId: article.documentId,
              attributes: {
                ...selectFields(article.attributes),
                labels_connection: {
                  data: labels.map((label) => ({
                    documentId: label.documentId,
                    attributes: {
                      ...selectFields(label.attributes),
                      color: null,
                    },
                  })),
                },
              },
            },
          },
        },
      });
    });

    test('Delete Labels and test Articles relations', async () => {
      for (const label of data.labels) {
        const res = await graphqlQuery({
          query: /* GraphQL */ `
            mutation deleteLabel($documentId: ID!) {
              deleteLabel(documentId: $documentId) {
                documentId
              }
            }
          `,
          variables: {
            documentId: label.documentId,
          },
        });

        expect(res.statusCode).toBe(200);
        expect(res.body).toMatchObject({
          data: {
            deleteLabel: {
              documentId: label.documentId,
            },
          },
        });
      }

      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            articles_connection {
              data {
                documentId
                attributes {
                  name
                  labels_connection {
                    data {
                      documentId
                      attributes {
                        name
                        color {
                          name
                          red
                          green
                          blue
                        }
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
            data: expect.arrayContaining(
              data.articles.map((article) => ({
                documentId: article.documentId,
                attributes: {
                  ...selectFields(article.attributes),
                  labels_connection: { data: [] },
                },
              }))
            ),
          },
        },
      });
    });

    test('Delete Articles', async () => {
      for (const article of data.articles) {
        const res = await graphqlQuery({
          query: /* GraphQL */ `
            mutation deleteArticle($documentId: ID!) {
              deleteArticle(documentId: $documentId) {
                documentId
              }
            }
          `,
          variables: {
            documentId: article.documentId,
          },
        });

        expect(res.statusCode).toBe(200);
        expect(res.body).toMatchObject({
          data: {
            deleteArticle: {
              documentId: article.documentId,
            },
          },
        });
      }
    });

    test('Create person', async () => {
      const person = {
        name: 'Chuck Norris',
        privateName: 'Jean-Eude',
      };

      const res = await graphqlQuery({
        query: /* GraphQL */ `
          mutation createPerson($data: PersonInput!) {
            createPerson(data: $data) {
              data {
                documentId
                attributes {
                  name
                }
              }
            }
          }
        `,
        variables: {
          data: person,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        data: {
          createPerson: {
            data: {
              documentId: expect.anything(),
              attributes: {
                name: person.name,
              },
            },
          },
        },
      });

      data.people.push(res.body.data.createPerson.data);
    });

    test("Can't list a private field", async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            people_connection {
              data {
                attributes {
                  name
                  privateName
                }
              }
            }
          }
        `,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        errors: [
          {
            message: 'Cannot query field "privateName" on type "Person".',
          },
        ],
      });
    });

    test('Create a car linked to a person (oneToMany)', async () => {
      const car = {
        name: 'Peugeot 508',
        person: data.people[0].documentId,
      };

      const res = await graphqlQuery({
        query: /* GraphQL */ `
          mutation createCar($data: CarInput!) {
            createCar(data: $data) {
              data {
                documentId
                attributes {
                  name
                  person {
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
        variables: {
          data: car,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        data: {
          createCar: {
            data: {
              documentId: expect.anything(),
              attributes: {
                name: car.name,
                person: {
                  data: data.people[0],
                },
              },
            },
          },
        },
      });

      data.cars.push({ documentId: res.body.data.createCar.data.documentId });
    });

    test("Can't list a private oneToMany relation", async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            people_connection {
              data {
                attributes {
                  name
                  privateCars
                }
              }
            }
          }
        `,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        errors: [
          {
            message: 'Cannot query field "privateCars" on type "Person".',
          },
        ],
      });
    });

    test('Edit person/cars relations removes correctly a car', async () => {
      const newPerson = {
        name: 'Check Norris Junior',
        privateCars: [],
      };

      const mutationRes = await graphqlQuery({
        query: /* GraphQL */ `
          mutation updatePerson($documentId: ID!, $data: PersonInput!) {
            updatePerson(documentId: $documentId, data: $data) {
              data {
                documentId
              }
            }
          }
        `,
        variables: {
          documentId: data.people[0].documentId,
          data: newPerson,
        },
      });

      expect(mutationRes.statusCode).toBe(200);

      const queryRes = await graphqlQuery({
        query: /* GraphQL */ `
          query ($documentId: ID!) {
            car(documentId: $documentId) {
              data {
                attributes {
                  person {
                    data {
                      documentId
                    }
                  }
                }
              }
            }
          }
        `,
        variables: {
          documentId: data.cars[0].documentId,
        },
      });

      expect(queryRes.statusCode).toBe(200);
      expect(queryRes.body).toEqual({
        data: {
          car: {
            data: {
              attributes: {
                person: null,
              },
            },
          },
        },
      });
    });
  });
});
