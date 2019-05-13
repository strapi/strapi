// Helpers.
const { registerAndLogin } = require('../../../test/helpers/auth');
const createModelsUtils = require('../../../test/helpers/models');
const { createAuthRequest } = require('../../../test/helpers/request');

let rq;
let graphqlQuery;
let modelsUtils;

const postModel = {
  attributes: [
    {
      name: 'name',
      params: {
        appearance: {
          WYSIWYG: false,
        },
        multiple: false,
        type: 'string',
      },
    },
    {
      name: 'bigint',
      params: {
        type: 'biginteger',
      },
    },
  ],
  connection: 'default',
  name: 'post',
  description: '',
  collectionName: '',
};

describe('Test Graphql API End to End', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);

    graphqlQuery = body => {
      return rq({
        url: '/graphql',
        method: 'POST',
        body,
      });
    };

    modelsUtils = createModelsUtils({ rq });

    await modelsUtils.createModels([postModel]);
  }, 60000);

  afterAll(() => modelsUtils.deleteModels(['post']), 60000);

  describe('Test CRUD', () => {
    const postsPayload = [
      { name: 'post 1', bigint: 1316130638171 },
      { name: 'post 2', bigint: 1416130639261 },
    ];
    let data = {
      posts: [],
    };

    test.each(postsPayload)('Create Post %o', async post => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          mutation createPost($input: createPostInput) {
            createPost(input: $input) {
              post {
                name
                bigint
              }
            }
          }
        `,
        variables: {
          input: {
            data: post,
          },
        },
      });

      const { body } = res;

      expect(res.statusCode).toBe(200);
      expect(body).toEqual({
        data: {
          createPost: {
            post,
          },
        },
      });
    });

    test('List posts', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            posts {
              id
              name
              bigint
            }
          }
        `,
      });

      const { body } = res;

      expect(res.statusCode).toBe(200);
      expect(body).toMatchObject({
        data: {
          posts: postsPayload,
        },
      });

      // assign for later use
      data.posts = res.body.data.posts;
    });

    test('List posts with limit', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            posts(limit: 1) {
              id
              name
              bigint
            }
          }
        `,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        data: {
          posts: [data.posts[0]],
        },
      });
    });

    test('List posts with sort', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            posts(sort: "name:desc") {
              id
              name
              bigint
            }
          }
        `,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        data: {
          posts: [...data.posts].reverse(),
        },
      });
    });

    test('List posts with start', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          {
            posts(start: 1) {
              id
              name
              bigint
            }
          }
        `,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        data: {
          posts: [data.posts[1]],
        },
      });
    });

    test.each([
      [
        {
          name: 'post 1',
          bigint: 1316130638171,
        },
        [postsPayload[0]],
      ],
      [
        {
          name_eq: 'post 1',
          bigint_eq: 1316130638171,
        },
        [postsPayload[0]],
      ],
      [
        {
          name_ne: 'post 1',
          bigint_ne: 1316130638171,
        },
        [postsPayload[1]],
      ],
      [
        {
          name_contains: 'Post',
        },
        postsPayload,
      ],
      [
        {
          name_contains: 'Post 1',
        },
        [postsPayload[0]],
      ],
      [
        {
          name_containss: 'post',
        },
        postsPayload,
      ],
      [
        {
          name_ncontainss: 'post 1',
        },
        [postsPayload[1]],
      ],
      [
        {
          name_in: ['post 1', 'post 2'],
        },
        postsPayload,
      ],
      [
        {
          name_nin: ['post 2'],
        },
        [postsPayload[0]],
      ],
    ])('List posts with where clause %o', async (where, expected) => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          query findPosts($where: JSON) {
            posts(where: $where) {
              name
              bigint
            }
          }
        `,
        variables: {
          where,
        },
      });

      expect(res.statusCode).toBe(200);

      // same length
      expect(res.body.data.posts.length).toBe(expected.length);

      // all the posts returned are in the expected array
      res.body.data.posts.forEach(post => {
        expect(expected).toEqual(expect.arrayContaining([post]));
      });

      // all expected values are in the result
      expected.forEach(expectedPost => {
        expect(res.body.data.posts).toEqual(expect.arrayContaining([expectedPost]));
      });
    });

    test('Get One Post', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          query getPost($id: ID!) {
            post(id: $id) {
              id
              name
              bigint
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
          post: data.posts[0],
        },
      });
    });

    test('Update Post', async () => {
      const newName = 'new post name';
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          mutation updatePost($input: updatePostInput) {
            updatePost(input: $input) {
              post {
                id
                name
              }
            }
          }
        `,
        variables: {
          input: {
            where: {
              id: data.posts[0].id,
            },
            data: {
              name: newName,
            },
          },
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        data: {
          updatePost: {
            post: {
              id: data.posts[0].id,
              name: newName,
            },
          },
        },
      });

      data.posts[0] = res.body.data.updatePost.post;
    });

    test('Delete Posts', async () => {
      for (let post of data.posts) {
        const res = await graphqlQuery({
          query: /* GraphQL */ `
            mutation deletePost($input: deletePostInput) {
              deletePost(input: $input) {
                post {
                  name
                  bigint
                }
              }
            }
          `,
          variables: {
            input: {
              where: {
                id: post.id,
              },
            },
          },
        });

        expect(res.statusCode).toBe(200);
      }
    });
  });
});
