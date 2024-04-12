'use strict';

const { omit, prop } = require('lodash/fp');

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
    name: {
      type: 'richtext',
    },
    bigint: {
      type: 'biginteger',
    },
    nullable: {
      type: 'string',
    },
    category: {
      type: 'enumeration',
      enum: ['BLOG', 'PRODUCT', 'TUTORIALS'],
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

  describe('Test CRUD', () => {
    const postsPayload = [
      { name: 'post 1', bigint: 1316130638171, nullable: 'value', category: 'BLOG' },
      { name: 'post 2', bigint: 1416130639261, nullable: null, category: 'PRODUCT' },
    ];
    const data = {
      posts: [],
    };

    test.each(postsPayload)('Create Post %o', async (post) => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          mutation createPost($data: PostInput!) {
            createPost(data: $data) {
              data {
                documentId
                attributes {
                  name
                  publishedAt
                  bigint
                  nullable
                  category
                }
              }
            }
          }
        `,
        variables: {
          data: post,
        },
      });

      const { body } = res;

      expect(res.statusCode).toBe(200);
      expect(body).toEqual({
        data: {
          createPost: {
            data: {
              documentId: expect.any(String),
              attributes: {
                ...post,
                publishedAt: expect.any(String),
              },
            },
          },
        },
      });
    });

    test('List posts', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            posts_connection {
              data {
                documentId
                attributes {
                  name
                  bigint
                  nullable
                  category
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
          posts_connection: {
            data: postsPayload.map((entry) => ({
              documentId: expect.any(String),
              attributes: omit('documentId', entry),
            })),
          },
        },
      });

      // assign for later use
      data.posts = res.body.data.posts_connection.data.map(({ documentId, attributes }) => ({
        documentId,
        ...attributes,
      }));
    });

    test('List posts with GET', async () => {
      const graphqlQueryGET = (body) => {
        return rq({
          url: '/graphql',
          method: 'GET',
          qs: body,
        });
      };

      const res = await graphqlQueryGET({
        query: /* GraphQL */ `
          {
            posts: posts_connection {
              data {
                id
                attributes {
                  name
                  bigint
                  nullable
                  category
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
          posts: {
            data: postsPayload.map((entry) => ({
              id: expect.any(String),
              attributes: omit('id', entry),
            })),
          },
        },
      });
    });

    test('List posts with limit', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            posts_connection(pagination: { limit: 1 }) {
              data {
                documentId
                attributes {
                  name
                  bigint
                  nullable
                  category
                }
              }
            }
          }
        `,
      });

      const expectedPost = data.posts[0];

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        data: {
          posts_connection: {
            data: [
              {
                documentId: expectedPost.documentId,
                attributes: omit('documentId', expectedPost),
              },
            ],
          },
        },
      });
    });

    test('List posts with sort', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            posts_connection(sort: "name:desc") {
              data {
                documentId
                attributes {
                  name
                  bigint
                  nullable
                  category
                }
              }
            }
          }
        `,
      });

      const expectedPosts = [...data.posts].reverse().map((entry) => ({
        documentId: expect.any(String),
        attributes: omit('documentId', entry),
      }));

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        data: {
          posts_connection: {
            data: expectedPosts,
          },
        },
      });
    });

    test('List posts with start', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            posts_connection(pagination: { start: 1 }) {
              data {
                documentId
                attributes {
                  name
                  bigint
                  nullable
                  category
                }
              }
            }
          }
        `,
      });

      const expectedPost = data.posts[1];

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        data: {
          posts_connection: {
            data: [
              {
                documentId: expectedPost.documentId,
                attributes: omit('documentId', expectedPost),
              },
            ],
          },
        },
      });
    });

    test('Pagination counts are correct', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            posts_connection(filters: { name: { eq: "post 2" } }) {
              data {
                documentId
                attributes {
                  name
                  bigint
                  nullable
                  category
                }
              }
              meta {
                pagination {
                  total
                  pageSize
                  page
                  pageCount
                }
              }
            }
          }
        `,
      });

      const expectedPost = data.posts[1];

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        data: {
          posts_connection: {
            data: [
              {
                documentId: expectedPost.documentId,
                attributes: omit('documentId', expectedPost),
              },
            ],
            meta: {
              pagination: {
                total: 1,
                pageSize: 10,
                page: 1,
                pageCount: 1,
              },
            },
          },
        },
      });
    });

    test.skip('List posts with `createdBy` and `updatedBy`', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            posts_connection(start: 1) {
              data {
                documentId
                attributes {
                  name
                  bigint
                  nullable
                  category
                }
              }
            }
          }
        `,
      });

      expect(res.statusCode).toBe(200);

      // no errors should be present in the response
      expect(res.body.error).toBeUndefined();

      // since the posts are created without AdminUser, it should return null
      expect(res.body.data.posts_connection[0].createdBy).toBeNull();
    });

    test.each([
      [
        {
          name: { eq: 'post 1' },
          bigint: { eq: 1316130638171 },
        },
        [postsPayload[0]],
      ],
      [
        {
          category: { eq: 'BLOG' },
        },
        [postsPayload[0]],
      ],
      [
        {
          name: { not: { eq: 'post 1' } },
          bigint: { not: { eq: 1316130638171 } },
        },
        [postsPayload[1]],
      ],
      [
        {
          category: { eqi: 'Blog' },
        },
        [postsPayload[0]],
      ],
      [
        {
          name: { contains: 'post' },
        },
        postsPayload,
      ],
      [
        {
          category: { contains: 'PRO' },
        },
        [postsPayload[1]],
      ],
      [
        {
          name: { contains: 'post 1' },
        },
        [postsPayload[0]],
      ],
      [
        {
          name: { containsi: 'Post' },
        },
        postsPayload,
      ],
      [
        {
          name: { not: { containsi: 'Post 1' } },
        },
        [postsPayload[1]],
      ],
      [
        {
          name: { in: ['post 1', 'post 2', 'post 3'] },
        },
        postsPayload,
      ],
      [
        {
          name: { not: { in: ['post 2'] } },
        },
        [postsPayload[0]],
      ],
      [
        {
          or: [{ name: { in: ['post 2'] } }, { bigint: { eq: 1316130638171 } }],
        },
        [postsPayload[0], postsPayload[1]],
      ],
      [
        {
          and: [{ or: [{ name: { in: ['post 2'] } }, { bigint: { eq: 1316130638171 } }] }],
        },
        [postsPayload[0], postsPayload[1]],
      ],
      [
        {
          and: [
            {
              or: [
                { name: { in: ['post 2'] } },
                { or: [{ bigint: { eq: 1316130638171 } }, { nullable: { not: { null: true } } }] },
              ],
            },
          ],
        },
        [postsPayload[0], postsPayload[1]],
      ],
    ])('List posts with filters clause %o', async (filters, expected) => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          query findPosts($filters: PostFiltersInput) {
            posts_connection(filters: $filters) {
              data {
                attributes {
                  name
                  bigint
                  nullable
                  category
                }
              }
            }
          }
        `,
        variables: {
          filters,
        },
      });

      expect(res.statusCode).toBe(200);

      const { data: posts } = res.body.data.posts_connection;

      // same length
      expect(posts.length).toBe(expected.length);

      // all the posts returned are in the expected array
      posts.map(prop('attributes')).forEach((post) => {
        expect(expected.map(omit('documentId'))).toEqual(expect.arrayContaining([post]));
      });

      // all expected values are in the result
      expected.forEach((expectedPost) => {
        expect(posts.map(prop('attributes'))).toEqual(
          expect.arrayContaining([omit('documentId', expectedPost)])
        );
      });
    });

    test('Get One Post', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          query getPost($documentId: ID!) {
            post(documentId: $documentId) {
              data {
                documentId
                attributes {
                  name
                  bigint
                  nullable
                  category
                }
              }
            }
          }
        `,
        variables: {
          documentId: data.posts[0].documentId,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        data: {
          post: {
            data: {
              documentId: data.posts[0].documentId,
              attributes: omit('documentId', data.posts[0]),
            },
          },
        },
      });
    });

    test('Update Post', async () => {
      const newName = 'new post name';
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          mutation updatePost($documentId: ID!, $data: PostInput!) {
            updatePost(documentId: $documentId, data: $data) {
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
          documentId: data.posts[0].documentId,
          data: {
            name: newName,
          },
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        data: {
          updatePost: {
            data: {
              documentId: data.posts[0].documentId,
              attributes: {
                name: newName,
              },
            },
          },
        },
      });

      const newPost = res.body.data.updatePost.data;

      data.posts[0] = {
        documentId: newPost.documentId,
        ...newPost.attributes,
      };
    });

    test('Delete Posts', async () => {
      for (const post of data.posts) {
        const res = await graphqlQuery({
          query: /* GraphQL */ `
            mutation deletePost($documentId: ID!) {
              deletePost(documentId: $documentId) {
                documentId
              }
            }
          `,
          variables: {
            documentId: post.documentId,
          },
        });

        expect(res.statusCode).toBe(200);
        expect(res.body).toMatchObject({
          data: {
            deletePost: {
              documentId: post.documentId,
            },
          },
        });
      }
    });
  });
});
