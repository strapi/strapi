'use strict';

// Helpers.
const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;
let graphqlQuery;
const data = {};

const homePageModel = {
  singularName: 'home-page',
  pluralName: 'home-pages',
  displayName: 'Homepage',
  kind: 'singleType',
  attributes: {
    title: {
      type: 'string',
    },
  },
};

const updateContent = (data) => {
  return graphqlQuery({
    query: /* GraphQL */ `
      mutation updateHomePage($data: HomePageInput!) {
        updateHomePage(data: $data) {
          data {
            documentId
          }
        }
      }
    `,
    variables: { data },
  });
};

describe('Single type Graphql support', () => {
  beforeAll(async () => {
    await builder.addContentType(homePageModel).build();

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

  describe('Queries', () => {
    test('No list available', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            homePages {
              data {
                documentId
              }
            }
          }
        `,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.errors).toMatchObject(
        expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringMatching('Cannot query field "homePages"'),
          }),
        ])
      );
    });

    test('Access the single type without args', async () => {
      await updateContent({
        title: 'Test',
      });

      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            homePage {
              data {
                documentId
                attributes {
                  title
                }
              }
            }
          }
        `,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toEqual({
        homePage: {
          data: {
            documentId: expect.anything(),
            attributes: {
              title: 'Test',
            },
          },
        },
      });

      data.documentId = res.body.data.homePage.data.documentId;
    });
  });

  describe('Mutations', () => {
    test('Cannot create', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          mutation {
            createHomePage(input: { data: { title: "Test" } }) {
              documentId
            }
          }
        `,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.errors).toMatchObject(
        expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringMatching('Cannot query field "createHomePage"'),
          }),
        ])
      );
    });

    test('update a single type does not require documentId', async () => {
      const updateRes = await graphqlQuery({
        query: /* GraphQL */ `
          mutation updateHomePage($data: HomePageInput!) {
            updateHomePage(data: $data) {
              data {
                documentId
                attributes {
                  title
                }
              }
            }
          }
        `,
        variables: {
          data: {
            title: 'New Title',
          },
        },
      });

      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body.data).toEqual({
        updateHomePage: {
          data: {
            documentId: data.documentId,
            attributes: {
              title: 'New Title',
            },
          },
        },
      });

      const getRes = await graphqlQuery({
        query: /* GraphQL */ `
          {
            homePage {
              data {
                documentId
                attributes {
                  title
                }
              }
            }
          }
        `,
      });

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body.data).toEqual({
        homePage: {
          data: {
            documentId: data.documentId,
            attributes: {
              title: 'New Title',
            },
          },
        },
      });
    });

    test('Can delete without params', async () => {
      const deleteRes = await graphqlQuery({
        query: /* GraphQL */ `
          mutation {
            deleteHomePage {
              documentId
            }
          }
        `,
      });

      expect(deleteRes.statusCode).toBe(200);
      expect(deleteRes.body.data).toEqual({
        deleteHomePage: {
          documentId: data.documentId,
        },
      });

      const getRes = await graphqlQuery({
        query: /* GraphQL */ `
          {
            homePage {
              data {
                documentId
                attributes {
                  title
                }
              }
            }
          }
        `,
      });

      expect(getRes.statusCode).toBe(200);
      expect(getRes.body.data).toEqual({
        homePage: null,
      });
    });
  });
});
