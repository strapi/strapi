'use strict';

// Helpers.
const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;
let graphqlQuery;

const postModel = {
  attributes: {
    myDatetime: {
      type: 'datetime',
    },
  },
  singularName: 'post',
  pluralName: 'posts',
  displayName: 'Post',
  description: '',
  collectionName: '',
};

describe('Test Graphql API End to End', () => {
  beforeAll(async () => {
    await builder.addContentType(postModel).build();

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

  describe('GraphQL - Datetime field', () => {
    test.each(['2022-03-17T15:06:57.000Z', null])(
      'Can create an entity with datetime equals: %s',
      async (value) => {
        const res = await graphqlQuery({
          query: /* GraphQL */ `
            mutation createPost($data: PostInput!) {
              createPost(data: $data) {
                data {
                  attributes {
                    myDatetime
                  }
                }
              }
            }
          `,
          variables: {
            data: {
              myDatetime: value,
            },
          },
        });

        const { body } = res;

        expect(res.statusCode).toBe(200);
        expect(body).toEqual({
          data: {
            createPost: {
              data: {
                attributes: { myDatetime: value },
              },
            },
          },
        });
      }
    );

    test.each(['2022-03-17', {}, [], 'something'])(
      'Cannot create an entity with datetime equals: %s',
      async (value) => {
        const res = await graphqlQuery({
          query: /* GraphQL */ `
            mutation createPost($data: PostInput!) {
              createPost(data: $data) {
                data {
                  attributes {
                    myDatetime
                  }
                }
              }
            }
          `,
          variables: {
            data: {
              myDatetime: value,
            },
          },
        });

        const { body } = res;

        expect(res.statusCode).toBe(400);
        expect(body).toMatchObject({
          errors: [
            {
              extensions: { code: 'BAD_USER_INPUT' },
            },
          ],
        });
      }
    );

    test.each(['2022-03-17T15:06:57.878Z'])('Can filter query with datetime: %s', async (value) => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          query posts($myDatetime: DateTime!) {
            posts_connection(filters: { myDatetime: { gt: $myDatetime } }) {
              data {
                attributes {
                  myDatetime
                }
              }
            }
          }
        `,
        variables: {
          myDatetime: value,
        },
      });

      const { body } = res;

      expect(res.statusCode).toBe(200);
      expect(body).toEqual({
        data: {
          posts_connection: {
            data: [],
          },
        },
      });
    });
  });
});
