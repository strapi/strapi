'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createRequest, createAuthRequest } = require('api-tests/request');
const { createTestBuilder } = require('api-tests/builder');

// Test a simple default API with no relations
describe('Simple Test GraphQL Users API End to End', () => {
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
    strapi = await createStrapiInstance({
      async bootstrap({ strapi: s }) {
        s.config.set('plugin::users-permissions.ratelimit', {
          enabled: true,
          interval: { min: 5 },
          max: 1,
        });
        s.config.set('plugin::graphql.apolloServer', {
          allowBatchedHttpRequests: true,
        });
      },
    });
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
    const forgotPasswordMutation = /* GraphQL */ `
      mutation forgotPassword($email: String!) {
        forgotPassword(email: $email) {
          ok
        }
      }
    `;

    const expectRateLimitError = (body) => {
      expect(
        body.errors?.some((error) => error.message === 'Too many requests, please try again later.')
      ).toBe(true);
    };

    test('Rate limits repeated forgotPassword mutations', async () => {
      const responses = [];

      for (let attempt = 0; attempt < 2; attempt += 1) {
        responses.push(
          await graphqlQuery({
            query: forgotPasswordMutation,
            variables: {
              email: 'missing-user-rate-limit@strapi.io',
            },
          })
        );
      }

      expect(responses.every((res) => res.statusCode === 200)).toBe(true);
      expect(responses.some((res) => res.body.data?.forgotPassword?.ok === true)).toBe(true);
      expect(responses.some((res) => res.body.errors)).toBe(true);
      expectRateLimitError(responses.find((res) => res.body.errors).body);
    });

    test('Shares the forgotPassword rate-limit bucket with REST', async () => {
      const email = 'rest-graphql-shared-bucket@strapi.io';
      const restResponse = await rq({
        url: '/api/auth/forgot-password',
        method: 'POST',
        body: { email },
      });
      const graphqlResponse = await graphqlQuery({
        query: forgotPasswordMutation,
        variables: { email },
      });

      expect(restResponse.statusCode).toBe(200);
      expect(graphqlResponse.statusCode).toBe(200);
      expectRateLimitError(graphqlResponse.body);
    });

    test('Isolates request state for batched forgotPassword mutations', async () => {
      const emails = [
        'batch-decoy-one@strapi.io',
        'batch-decoy-two@strapi.io',
        'batch-target@strapi.io',
      ];
      const authenticatedRole = await strapi.db
        .query('plugin::users-permissions.role')
        .findOne({ where: { type: 'authenticated' } });
      const createdUsers = [];
      const sendEmail = jest
        .spyOn(strapi.plugin('email').service('email'), 'send')
        .mockResolvedValue();

      try {
        for (const [index, email] of emails.entries()) {
          createdUsers.push(
            await strapi.db.query('plugin::users-permissions.user').create({
              data: {
                username: `batch-user-${index}`,
                email,
                password: 'test1234',
                provider: 'local',
                confirmed: true,
                role: authenticatedRole.id,
              },
            })
          );
        }

        const response = await graphqlQuery(
          emails.map((email) => ({
            query: forgotPasswordMutation,
            variables: { email },
          }))
        );

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveLength(emails.length);
        expect(response.body).toEqual(
          expect.arrayContaining(emails.map(() => ({ data: { forgotPassword: { ok: true } } })))
        );
        expect(sendEmail).toHaveBeenCalledTimes(emails.length);
        expect(sendEmail.mock.calls.map(([message]) => message.to).sort()).toEqual(
          [...emails].sort()
        );

        const targetResponse = await graphqlQuery({
          query: forgotPasswordMutation,
          variables: { email: emails.at(-1) },
        });
        expectRateLimitError(targetResponse.body);
      } finally {
        sendEmail.mockRestore();
        await strapi.db
          .query('plugin::users-permissions.user')
          .deleteMany({ where: { id: { $in: createdUsers.map(({ id }) => id) } } });
      }
    });

    test('Rate limits resetPassword before repeat invalid-code validation', async () => {
      const resetPasswordMutation = /* GraphQL */ `
        mutation resetPassword($code: String!, $password: String!, $passwordConfirmation: String!) {
          resetPassword(
            code: $code
            password: $password
            passwordConfirmation: $passwordConfirmation
          ) {
            jwt
          }
        }
      `;
      const invalidAttempt = () =>
        graphqlQuery({
          query: resetPasswordMutation,
          variables: {
            code: 'invalid-reset-code',
            password: 'Strapi1234',
            passwordConfirmation: 'Strapi1234',
          },
        });

      const firstResponse = await invalidAttempt();
      const secondResponse = await invalidAttempt();

      expect(firstResponse.statusCode).toBe(200);
      expect(firstResponse.body.errors).toBeDefined();
      expect(firstResponse.body.errors[0].message).not.toBe(
        'Too many requests, please try again later.'
      );
      expect(secondResponse.statusCode).toBe(200);
      expectRateLimitError(secondResponse.body);
    });

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

      const secondRes = await graphqlQuery({
        query: /* GraphQL */ `
          mutation register($input: UsersPermissionsRegisterInput!) {
            register(input: $input) {
              jwt
            }
          }
        `,
        variables: { input: user },
      });
      expectRateLimitError(secondRes.body);

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

      const secondRes = await graphqlQuery({
        query: /* GraphQL */ `
          mutation login($input: UsersPermissionsLoginInput!) {
            login(input: $input) {
              jwt
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
      expectRateLimitError(secondRes.body);
    });

    test('Rate limits repeated changePassword mutations after controller authentication rejects', async () => {
      const changePasswordMutation = /* GraphQL */ `
        mutation changePassword(
          $currentPassword: String!
          $password: String!
          $passwordConfirmation: String!
        ) {
          changePassword(
            currentPassword: $currentPassword
            password: $password
            passwordConfirmation: $passwordConfirmation
          ) {
            jwt
          }
        }
      `;
      const variables = {
        currentPassword: user.password,
        password: 'new-test1234',
        passwordConfirmation: 'new-test1234',
      };
      const firstResponse = await graphqlQuery({ query: changePasswordMutation, variables });
      const secondResponse = await graphqlQuery({ query: changePasswordMutation, variables });

      expect(firstResponse.body.errors?.[0].message).toBe(
        'You must be authenticated to reset your password'
      );
      expectRateLimitError(secondResponse.body);
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

    // Regression for https://github.com/strapi/strapi/issues/24343 — the `role`
    // relation is exposed as an `ID` scalar in GraphQL, so it must accept a
    // `documentId` string (the v5 default), consistent with REST. A numeric id
    // worked already; a documentId previously failed validation downstream.
    test('Update a user role by documentId', async () => {
      const role = await strapi.db
        .query('plugin::users-permissions.role')
        .findOne({ where: { type: 'authenticated' } });

      const res = await graphqlQuery({
        query: /* GraphQL */ `
          mutation updateUser($id: ID!, $data: UsersPermissionsUserInput!) {
            updateUsersPermissionsUser(id: $id, data: $data) {
              data {
                attributes {
                  username
                }
              }
            }
          }
        `,
        variables: {
          id: data.user.id,
          data: { role: role.documentId },
        },
      });

      const { body } = res;

      expect(res.statusCode).toBe(200);
      expect(body.errors).toBeUndefined();
      expect(body.data.updateUsersPermissionsUser.data.attributes.username).toBe('User Test');

      // Verify the role was actually assigned (not just that the mutation
      // returned without error).
      const updated = await strapi.db
        .query('plugin::users-permissions.user')
        .findOne({ where: { id: data.user.id }, populate: ['role'] });
      expect(updated.role.id).toBe(role.id);
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
describe('Advanced Test GraphQL Users API End to End', () => {
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

  /**
   * This is no longer allowed for security reasons
   * We only have register.allowedFields to allow fields to be submitted on registration
   * TODO: add update.allowedFields feature and re-enable
   *  */
  describe.skip('Test register and login with component', () => {
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
