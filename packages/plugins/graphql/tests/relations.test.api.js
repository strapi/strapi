'use strict';

// Helpers.
const { pick } = require('lodash/fp');
const { createTestBuilder } = require('../../../../test/helpers/builder');
const { createStrapiInstance } = require('../../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../../test/helpers/request');

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

const documentModel = {
  attributes: {
    name: {
      type: 'richtext',
    },
    content: {
      type: 'richtext',
    },
  },
  singularName: 'document',
  pluralName: 'documents',
  displayName: 'Document',
  description: '',
  collectionName: '',
};

const labelModel = {
  attributes: {
    name: {
      type: 'richtext',
    },
    documents: {
      type: 'relation',
      relation: 'manyToMany',
      target: 'api::document.document',
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
      .addContentTypes([documentModel, labelModel, carModel, personModel])
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
      documents: [],
      people: [],
      cars: [],
    };
    const labelsPayload = [
      { name: 'label 1', color: null },
      { name: 'label 2', color: null },
      { name: 'labelWithColor', color: { name: 'tomato', red: 255, green: 99, blue: 71 } },
    ];
    const documentsPayload = [{ name: 'document 1' }, { name: 'document 2' }];

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
            labels {
              data {
                id
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
          labels: {
            data: labelsPayload.map((label) => ({ id: expect.any(String), attributes: label })),
          },
        },
      });

      // assign for later use
      data.labels = data.labels.concat(res.body.data.labels.data);
    });

    test.each(documentsPayload)('Create document linked to every labels %o', async (document) => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          mutation createDocument($data: DocumentInput!) {
            createDocument(data: $data) {
              data {
                id
                attributes {
                  name
                  labels {
                    data {
                      id
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
            ...document,
            labels: data.labels.map((t) => t.id),
          },
        },
      });

      const { body } = res;

      expect(res.statusCode).toBe(200);

      expect(body).toMatchObject({
        data: {
          createDocument: {
            data: {
              id: expect.any(String),
              attributes: {
                ...selectFields(document),
                labels: {
                  data: expect.arrayContaining(data.labels),
                },
              },
            },
          },
        },
      });

      data.documents.push(body.data.createDocument.data);
    });

    test('List documents with labels', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            documents {
              data {
                id
                attributes {
                  name
                  labels {
                    data {
                      id
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
          documents: {
            data: expect.arrayContaining(data.documents),
          },
        },
      });

      // assign for later use
      data.documents = res.body.data.documents.data;
    });

    test('List Labels with documents', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            labels {
              data {
                id
                attributes {
                  name
                  color {
                    name
                    red
                    green
                    blue
                  }
                  documents {
                    data {
                      id
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
          labels: {
            data: expect.arrayContaining(
              data.labels.map((label) => ({
                id: label.id,
                attributes: {
                  ...label.attributes,
                  documents: {
                    data: expect.arrayContaining(
                      data.documents.map((document) => ({
                        id: document.id,
                        attributes: selectFields(document.attributes),
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
      data.labels = res.body.data.labels.data;
    });

    test('List labels with documents paginated', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          query labels($pagination: PaginationArg!) {
            labels {
              data {
                id
                attributes {
                  name
                  color {
                    name
                    red
                    green
                    blue
                  }
                  documents(pagination: $pagination) {
                    data {
                      id
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
          labels: {
            data: expect.arrayContaining(
              data.labels.map((label) => ({
                id: label.id,
                attributes: {
                  ...label.attributes,
                  documents: {
                    data: expect.arrayContaining(
                      data.documents.slice(0, 1).map((document) => ({
                        id: document.id,
                        attributes: selectFields(document.attributes),
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
      data.labels = res.body.data.labels.data;
    });
    test('Deep query', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            documents(filters: { labels: { name: { contains: "label 1" } } }) {
              data {
                id
                attributes {
                  name
                  labels {
                    data {
                      id
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
          documents: {
            data: expect.arrayContaining(data.documents),
          },
        },
      });
    });

    test('Update Document relations removes correctly a relation', async () => {
      const document = data.documents[0];
      const labels = [data.labels[0]];

      // if I remove a label from an document is it working
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          mutation updateDocument($id: ID!, $data: DocumentInput!) {
            updateDocument(id: $id, data: $data) {
              data {
                id
                attributes {
                  name
                  labels {
                    data {
                      id
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
          id: document.id,
          data: {
            labels: labels.map((label) => label.id),
          },
        },
      });

      expect(res.body).toMatchObject({
        data: {
          updateDocument: {
            data: {
              id: document.id,
              attributes: {
                ...selectFields(document.attributes),
                labels: {
                  data: labels.map((label) => ({
                    id: label.id,
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

    test('Delete Labels and test Documents relations', async () => {
      for (const label of data.labels) {
        const res = await graphqlQuery({
          query: /* GraphQL */ `
            mutation deleteLabel($id: ID!) {
              deleteLabel(id: $id) {
                data {
                  id
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
            id: label.id,
          },
        });

        expect(res.statusCode).toBe(200);
        expect(res.body).toMatchObject({
          data: {
            deleteLabel: {
              data: {
                id: label.id,
                attributes: {
                  ...selectFields(label.attributes),
                  color: null,
                },
              },
            },
          },
        });
      }

      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            documents {
              data {
                id
                attributes {
                  name
                  labels {
                    data {
                      id
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
          documents: {
            data: expect.arrayContaining(
              data.documents.map((document) => ({
                id: document.id,
                attributes: {
                  ...selectFields(document.attributes),
                  labels: { data: [] },
                },
              }))
            ),
          },
        },
      });
    });

    test('Delete Documents', async () => {
      for (const document of data.documents) {
        const res = await graphqlQuery({
          query: /* GraphQL */ `
            mutation deleteDocument($id: ID!) {
              deleteDocument(id: $id) {
                data {
                  id
                  attributes {
                    name
                    labels {
                      data {
                        id
                        attributes {
                          name
                          color {
                            name
                            red
                            green
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
            id: document.id,
          },
        });

        expect(res.statusCode).toBe(200);
        expect(res.body).toMatchObject({
          data: {
            deleteDocument: {
              data: {
                id: document.id,
                attributes: {
                  ...selectFields(document.attributes),
                  labels: { data: [] },
                },
              },
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
                id
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
              id: expect.anything(),
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
            people {
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
        person: data.people[0].id,
      };

      const res = await graphqlQuery({
        query: /* GraphQL */ `
          mutation createCar($data: CarInput!) {
            createCar(data: $data) {
              data {
                id
                attributes {
                  name
                  person {
                    data {
                      id
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
              id: expect.anything(),
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

      data.cars.push({ id: res.body.data.createCar.data.id });
    });

    test("Can't list a private oneToMany relation", async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            people {
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
          mutation updatePerson($id: ID!, $data: PersonInput!) {
            updatePerson(id: $id, data: $data) {
              data {
                id
              }
            }
          }
        `,
        variables: {
          id: data.people[0].id,
          data: newPerson,
        },
      });

      expect(mutationRes.statusCode).toBe(200);

      const queryRes = await graphqlQuery({
        query: /* GraphQL */ `
          query ($id: ID!) {
            car(id: $id) {
              data {
                attributes {
                  person {
                    data {
                      id
                    }
                  }
                }
              }
            }
          }
        `,
        variables: {
          id: data.cars[0].id,
        },
      });

      expect(queryRes.statusCode).toBe(200);
      expect(queryRes.body).toEqual({
        data: {
          car: {
            data: {
              attributes: {
                person: {
                  data: null,
                },
              },
            },
          },
        },
      });
    });
  });
});
