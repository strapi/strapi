'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createRequest, createAuthRequest } = require('api-tests/request');
const { createTestBuilder } = require('api-tests/builder');

// Test a simple default API with no relations
describe.skip('Simple Test GraphQL Users API End to End', () => {
  let strapi;
  let rq;
  let graphqlQuery;
  const user = {
    username: 'User 1',
    email: 'user1@strapi.io',
    password: 'test1234',
  };
  const data = {};

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createRequest({ strapi });

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

    test('Update a user', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          mutation updateUser($id: ID!, $data: UsersPermissionsUserInput!) {
            updateUsersPermissionsUser(id: $id, data: $data) {
              data {
                attributes {
                  username
                  email
                }
              }
            }
          }
        `,
        variables: {
          id: data.user.id,
          data: { username: 'User Test' },
        },
      });

      const { body } = res;

      expect(res.statusCode).toBe(200);
      expect(body).toMatchObject({
        data: {
          updateUsersPermissionsUser: {
            data: {
              attributes: {
                username: 'User Test',
                email: data.user.email,
              },
            },
          },
        },
      });
    });

    test('Delete a user', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          mutation deleteUser($id: ID!) {
            deleteUsersPermissionsUser(id: $id) {
              data {
                attributes {
                  username
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
                username: 'User Test',
                email: data.user.email,
              },
            },
          },
        },
      });
    });
  });
});

// Test with attributes such as components, relations..
describe.skip('Advanced Test GraphQL Users API End to End', () => {
  const builder = createTestBuilder();

  let strapi;
  let rq;
  let authReq;
  let graphqlQuery;
  const user = {
    username: 'User 2',
    email: 'user2@strapi.io',
    password: 'test1234',
  };
  const component = {
    displayName: 'somecomponent',
    attributes: {
      name: {
        type: 'string',
      },
      isTesting: {
        type: 'boolean',
      },
    },
  };
  const data = {};

  const restart = async () => {
    await strapi.destroy();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
    authReq = await createAuthRequest({ strapi });

    graphqlQuery = (body) => {
      return rq({
        url: '/graphql',
        method: 'POST',
        body,
      });
    };
  };

  beforeAll(async () => {
    await builder.addComponent(component).build();

    strapi = await createStrapiInstance();
    rq = await createRequest({ strapi });
    authReq = await createAuthRequest({ strapi });

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

  test('Update user to add component attribute', async () => {
    const uid = 'plugin::users-permissions.user';

    const res = await authReq({
      method: 'PUT',
      url: `/content-type-builder/content-types/${uid}`,
      body: {
        contentType: {
          displayName: 'User',
          singularName: 'user',
          pluralName: 'users',
          description: '',
          kind: 'collectionType',
          collectionName: 'up_users',
          attributes: {
            username: {
              type: 'string',
              minLength: 3,
              unique: true,
              configurable: false,
              required: true,
            },
            email: {
              type: 'email',
              minLength: 6,
              configurable: false,
              required: true,
            },
            provider: {
              type: 'string',
              configurable: false,
            },
            password: {
              type: 'password',
              minLength: 6,
              configurable: false,
              private: true,
            },
            resetPasswordToken: {
              type: 'string',
              configurable: false,
              private: true,
            },
            confirmationToken: {
              type: 'string',
              configurable: false,
              private: true,
            },
            confirmed: {
              type: 'boolean',
              default: false,
              configurable: false,
            },
            blocked: {
              type: 'boolean',
              default: false,
              configurable: false,
            },
            role: {
              type: 'relation',
              relation: 'manyToOne',
              target: 'plugin::users-permissions.role',
              inversedBy: 'users',
              configurable: false,
            },
            someComponent: {
              type: 'component',
              repeatable: false,
              component: 'default.somecomponent',
            },
          },
        },
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({
      data: {
        uid,
      },
    });

    await restart();
  });

  describe('Test register and login with component', () => {
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

    test('Update a user', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          mutation updateUser($id: ID!, $data: UsersPermissionsUserInput!) {
            updateUsersPermissionsUser(id: $id, data: $data) {
              data {
                attributes {
                  username
                  email
                  someComponent {
                    name
                    isTesting
                  }
                }
              }
            }
          }
        `,
        variables: {
          id: data.user.id,
          data: {
            username: 'User Test',
            someComponent: { name: 'Changed Name', isTesting: false },
          },
        },
      });

      const { body } = res;

      expect(res.statusCode).toBe(200);
      expect(body).toMatchObject({
        data: {
          updateUsersPermissionsUser: {
            data: {
              attributes: {
                username: 'User Test',
                email: data.user.email,
                someComponent: {
                  name: 'Changed Name',
                  isTesting: false,
                },
              },
            },
          },
        },
      });
    });

    test('Delete a user', async () => {
      const res = await graphqlQuery({
        query: /* GraphQL */ `
          mutation deleteUser($id: ID!) {
            deleteUsersPermissionsUser(id: $id) {
              data {
                attributes {
                  username
                  email
                  someComponent {
                    name
                    isTesting
                  }
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
                username: 'User Test',
                email: data.user.email,
                someComponent: null,
              },
            },
          },
        },
      });
    });
  });
});
