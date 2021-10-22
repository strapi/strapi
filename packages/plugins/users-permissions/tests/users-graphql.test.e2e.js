'use strict';

// Test a simple default API with no relations

const { createStrapiInstance } = require('../../../../test/helpers/strapi');
const { createRequest } = require('../../../../test/helpers/request');

let strapi;
let rq;
let graphqlQuery;
let data = {};

const user = {
  username: 'User 1',
  email: 'user1@strapi.io',
  password: 'test1234',
};

describe('Test Graphql Users API End to End', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createRequest({ strapi });

    graphqlQuery = body => {
      return rq({
        url: '/graphql',
        method: 'POST',
        body,
      });
    };
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  describe('Test register and login', () => {
    test('Register a user', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          mutation register($input: UsersPermissionsRegisterInput!) {
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

      // Use the JWT returned by the login request to
      // authentify the next queries or mutations
      rq.setLoggedUser(user).setToken(res.body.data.login.jwt);

      data.user = res.body.data.login.user;
    });

    test('Delete a user', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          mutation deleteUser($id: ID!) {
            deleteUsersPermissionsUser(id: $id) {
              data {
                attributes {
                  email
                }
              }
            }
          }
        `,
        variables: {
          id: data.user.id,
        },
      });

      const { body } = res;

      expect(res.statusCode).toBe(200);
      expect(body).toMatchObject({
        data: {
          deleteUsersPermissionsUser: {
            data: {
              attributes: {
                email: data.user.email,
              },
            },
          },
        },
      });
    });
  });
});
