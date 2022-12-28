'use strict';

const { omit, prop } = require('lodash/fp');

// Helpers.
const { createTestBuilder } = require('../../../../test/helpers/builder');
const { createStrapiInstance } = require('../../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../../test/helpers/request');

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
          data: post,
        },
      });

      const { body } = res;

      expect(res.statusCode).toBe(200);
      expect(body).toEqual({
        data: {
          createPost: {
            data: {
              attributes: post,
            },
          },
        },
      });
    });

    test('List posts', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            posts {
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

      // assign for later use
      data.posts = res.body.data.posts.data.map(({ id, attributes }) => ({ id, ...attributes }));
    });

    test('List posts with limit', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            posts(pagination: { limit: 1 }) {
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

      const expectedPost = data.posts[0];

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        data: {
          posts: {
            data: [
              {
                id: expectedPost.id,
                attributes: omit('id', expectedPost),
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
            posts(sort: "name:desc") {
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

      const expectedPosts = [...data.posts].reverse().map((entry) => ({
        id: expect.any(String),
        attributes: omit('id', entry),
      }));

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        data: {
          posts: {
            data: expectedPosts,
          },
        },
      });
    });

    test('List posts with start', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            posts(pagination: { start: 1 }) {
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

      const expectedPost = data.posts[1];

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        data: {
          posts: {
            data: [
              {
                id: expectedPost.id,
                attributes: omit('id', expectedPost),
              },
            ],
          },
        },
      });
    });

    test.skip('List posts with `createdBy` and `updatedBy`', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            posts(start: 1) {
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

      expect(res.statusCode).toBe(200);

      // no errors should be present in the response
      expect(res.body.error).toBeUndefined();

      // since the posts are created without AdminUser, it should return null
      expect(res.body.data.posts[0].createdBy).toBeNull();
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
            posts(filters: $filters) {
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

      const { data: posts } = res.body.data.posts;

      // same length
      expect(posts.length).toBe(expected.length);

      // all the posts returned are in the expected array
      posts.map(prop('attributes')).forEach((post) => {
        expect(expected.map(omit('id'))).toEqual(expect.arrayContaining([post]));
      });

      // all expected values are in the result
      expected.forEach((expectedPost) => {
        expect(posts.map(prop('attributes'))).toEqual(
          expect.arrayContaining([omit('id', expectedPost)])
        );
      });
    });

    test('Get One Post', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          query getPost($id: ID!) {
            post(id: $id) {
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
        variables: {
          id: data.posts[0].id,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        data: {
          post: {
            data: {
              id: data.posts[0].id,
              attributes: omit('id', data.posts[0]),
            },
          },
        },
      });
    });

    test('Update Post', async () => {
      const newName = 'new post name';
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          mutation updatePost($id: ID!, $data: PostInput!) {
            updatePost(id: $id, data: $data) {
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
          id: data.posts[0].id,
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
              id: data.posts[0].id,
              attributes: {
                name: newName,
              },
            },
          },
        },
      });

      const newPost = res.body.data.updatePost.data;

      data.posts[0] = {
        id: newPost.id,
        ...newPost.attributes,
      };
    });

    test('Delete Posts', async () => {
      for (const post of data.posts) {
        const res = await graphqlQuery({
          query: /* GraphQL */ `
            mutation deletePost($id: ID!) {
              deletePost(id: $id) {
                data {
                  id
                  attributes {
                    name
                    nullable
                    bigint
                    category
                  }
                }
              }
            }
          `,
          variables: {
            id: post.id,
          },
        });

        expect(res.statusCode).toBe(200);
        expect(res.body).toMatchObject({
          data: {
            deletePost: {
              data: {
                id: post.id,
                attributes: omit('id', post),
              },
            },
          },
        });
      }
    });
  });
});
