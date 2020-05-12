// Test a simple default API with no relations

const { registerAndLogin } = require('../../../test/helpers/auth');
const { createAuthRequest } = require('../../../test/helpers/request');

let rq;
let graphqlQuery;
let data = {};

describe('Test Graphql Users API End to End', () => {
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
  }, 60000);

  describe('Test register and login', () => {
    const user = {
      username: 'User 1',
      email: 'user1@strapi.io',
      password: 'test1234',
    };

    test('Register a user', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          mutation register($input: UserInput!) {
            register(input: $input) {
              jwt
              user {
                id
                email
              }
            }
          }
        `,
        variables: {
          input: user,
        },
      });

      const { body } = res;

      expect(res.statusCode).toBe(200);
      expect(body).toMatchObject({
        data: {
          register: {
            jwt: expect.any(String),
            user: {
              id: expect.any(String),
              email: user.email,
            },
          },
        },
      });
      data.user = res.body.data.register.user;
    });

    test('Log in a user', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          mutation login($input: UsersPermissionsLoginInput!) {
            login(input: $input) {
              jwt
              user {
                id
                email
              }
            }
          }
        `,
        variables: {
          input: {
            identifier: user.username,
            password: user.password,
          },
        },
      });

      const { body } = res;

      expect(res.statusCode).toBe(200);
      expect(body).toMatchObject({
        data: {
          login: {
            jwt: expect.any(String),
            user: {
              id: expect.any(String),
              email: user.email,
            },
          },
        },
      });
      data.user = res.body.data.login.user;
    });

    test('Delete a user', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          mutation deleteUser($input: deleteUserInput) {
            deleteUser(input: $input) {
              user {
                email
              }
            }
          }
        `,
        variables: {
          input: {
            where: {
              id: data.user.id,
            },
          },
        },
      });

      const { body } = res;

      expect(res.statusCode).toBe(200);
      expect(body).toMatchObject({
        data: {
          deleteUser: {
            user: {
              email: data.user.email,
            },
          },
        },
      });
    });
  });
});
