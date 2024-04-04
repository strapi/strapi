'use strict';

// Helpers.
const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;
let graphqlQuery;

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

const labelModel = {
  attributes: {
    name: {
      type: 'richtext',
    },
    color: {
      type: 'component',
      component: 'default.rgb-color',
      repeatable: false,
    },
    colors: {
      type: 'component',
      component: 'default.rgb-color',
      repeatable: true,
    },
  },
  singularName: 'label',
  pluralName: 'labels',
  displayName: 'Label',
  description: '',
  collectionName: '',
};

describe('Test Graphql Components API End to End', () => {
  beforeAll(async () => {
    await builder.addComponent(rgbColorComponent).addContentTypes([labelModel]).build();

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

  describe('Test components features', () => {
    const data = {
      labels: [],
    };
    const labelsPayload = [
      {
        name: 'label 3, repeatable and non-repeatable',
        color: { name: 'tomato', red: 255, green: 99, blue: 71 },
        colors: [{ name: 'red', red: 255, green: 0, blue: 0 }],
      },
    ];

    test.each(labelsPayload)('Create entity with components %o', async (label) => {
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
                  colors {
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

    test('List entity with components', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            labels_connection {
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
                  colors {
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
            data: expect.arrayContaining(data.labels),
          },
        },
      });

      // assign for later use
      data.labels = res.body.data.labels_connection.data;
    });

    test('Entity with repeatable component filters', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            labels_connection {
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
                  colors(filters: { red: { eq: 255 } }) {
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
            data: expect.arrayContaining(data.labels),
          },
        },
      });
    });
  });
});
