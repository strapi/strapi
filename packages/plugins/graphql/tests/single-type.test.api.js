'use strict';

// Helpers.
const { createTestBuilder } = require('../../../../test/helpers/builder');
const { createStrapiInstance } = require('../../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../../test/helpers/request');

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
            id
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
                id
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
                id
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
            id: expect.anything(),
            attributes: {
              title: 'Test',
            },
          },
        },
      });

      data.id = res.body.data.homePage.data.id;
    });
  });

  describe('Mutations', () => {
    test('Cannot create', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          mutation {
            createHomePage(input: { data: { title: "Test" } }) {
              id
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

    test('update a single type does not require id', async () => {
      const updateRes = await graphqlQuery({
        query: /* GraphQL */ `
          mutation updateHomePage($data: HomePageInput!) {
            updateHomePage(data: $data) {
              data {
                id
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
            id: data.id,
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
                id
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
            id: data.id,
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
              data {
                id
                attributes {
                  title
                }
              }
            }
          }
        `,
      });

      expect(deleteRes.statusCode).toBe(200);
      expect(deleteRes.body.data).toEqual({
        deleteHomePage: {
          data: {
            id: data.id,
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
                id
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
          data: null,
        },
      });
    });
  });
});
