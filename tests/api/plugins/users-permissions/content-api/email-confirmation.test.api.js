'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createRequest } = require('api-tests/request');

let strapi;
let rq;
let emailSendMock;

const REDIRECT_URL = 'http://localhost:3000/confirmed';

const uniqueCredentials = () => {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    username: `confirm_${suffix}`,
    email: `confirm_${suffix}@example.com`,
    password: 'Test1234',
  };
};

const enableEmailConfirmation = async () => {
  const pluginStore = strapi.store({ type: 'plugin', name: 'users-permissions' });
  const advanced = (await pluginStore.get({ key: 'advanced' })) || {};

  await pluginStore.set({
    key: 'advanced',
    value: {
      ...advanced,
      allow_register: true,
      email_confirmation: true,
      email_confirmation_redirection: REDIRECT_URL,
    },
  });
};

const registerUser = async (credentials = uniqueCredentials()) => {
  const res = await rq({
    method: 'POST',
    url: '/local/register',
    body: credentials,
  });

  return { res, credentials };
};

const getUserByEmail = (email) =>
  strapi.db.query('plugin::users-permissions.user').findOne({
    where: { email },
    select: ['id', 'documentId', 'confirmationToken', 'confirmed'],
  });

const confirmByToken = (token) =>
  createRequest({ strapi })({
    method: 'GET',
    url: `/api/auth/email-confirmation?confirmation=${token}`,
  });

describe('Email confirmation API', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance({ bypassAuth: false });
    rq = createRequest({ strapi }).setURLPrefix('/api/auth');

    emailSendMock = jest.spyOn(strapi.plugin('email').service('email'), 'send').mockResolvedValue();

    await enableEmailConfirmation();
  });

  afterAll(async () => {
    emailSendMock?.mockRestore();
    await strapi.db.query('plugin::users-permissions.user').deleteMany();
    await strapi.destroy();
  });

  describe('register', () => {
    test('persists confirmationToken and returns an unconfirmed user', async () => {
      const { res, credentials } = await registerUser();

      expect(res.statusCode).toBe(200);
      expect(res.body.user).toMatchObject({
        email: credentials.email,
        confirmed: false,
      });

      const userInDb = await getUserByEmail(credentials.email);

      expect(userInDb.confirmationToken).toEqual(expect.any(String));
      expect(userInDb.confirmed).toBe(false);
    });

    test('returns the same numeric id as stored in the database', async () => {
      const { res, credentials } = await registerUser();

      const userInDb = await getUserByEmail(credentials.email);

      expect(res.body.user.id).toBe(userInDb.id);
      expect(typeof res.body.user.id).toBe('number');
    });

    test('still persists confirmationToken when email delivery fails', async () => {
      emailSendMock.mockRejectedValueOnce(new Error('SMTP connection refused'));

      const { res, credentials } = await registerUser();

      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toBe('Error sending confirmation email');

      const userInDb = await getUserByEmail(credentials.email);

      expect(userInDb).toBeTruthy();
      expect(userInDb.confirmationToken).toEqual(expect.any(String));
    });
  });

  describe('GET /auth/email-confirmation', () => {
    test('confirms a user with a valid token and redirects to the configured URL', async () => {
      const { credentials } = await registerUser();
      const userInDb = await getUserByEmail(credentials.email);

      const confirmRes = await confirmByToken(userInDb.confirmationToken);

      expect(confirmRes.statusCode).toBe(302);
      expect(confirmRes.headers.location).toBe(REDIRECT_URL);

      const confirmedUser = await getUserByEmail(credentials.email);

      expect(confirmedUser.confirmed).toBe(true);
      expect(confirmedUser.confirmationToken).toBeNull();
    });

    test('can still confirm when register failed to send the email', async () => {
      emailSendMock.mockRejectedValueOnce(new Error('SMTP connection refused'));

      const { credentials } = await registerUser();
      const userInDb = await getUserByEmail(credentials.email);

      const confirmRes = await confirmByToken(userInDb.confirmationToken);

      expect(confirmRes.statusCode).toBe(302);

      const confirmedUser = await getUserByEmail(credentials.email);

      expect(confirmedUser.confirmed).toBe(true);
    });

    test('rejects an unknown token with ValidationError', async () => {
      const confirmRes = await confirmByToken('not-a-real-token');

      expect(confirmRes.statusCode).toBe(400);
      expect(confirmRes.body.error).toMatchObject({
        name: 'ValidationError',
        message: 'Invalid token',
      });
    });

    test('rejects a stale token after resend generates a new one', async () => {
      const { credentials } = await registerUser();
      const firstToken = (await getUserByEmail(credentials.email)).confirmationToken;

      const resendRes = await rq({
        method: 'POST',
        url: '/send-email-confirmation',
        body: { email: credentials.email },
      });

      expect(resendRes.statusCode).toBe(200);

      const currentToken = (await getUserByEmail(credentials.email)).confirmationToken;

      expect(currentToken).toBeTruthy();
      expect(currentToken).not.toBe(firstToken);

      const staleRes = await confirmByToken(firstToken);

      expect(staleRes.statusCode).toBe(400);
      expect(staleRes.body.error.message).toBe('Invalid token');

      const validRes = await confirmByToken(currentToken);

      expect(validRes.statusCode).toBe(302);
    });
  });

  describe('GraphQL emailConfirmation', () => {
    const graphql = (body) =>
      createRequest({ strapi })({
        url: '/graphql',
        method: 'POST',
        body,
      });

    test('returns jwt and user for a valid token', async () => {
      const { credentials } = await registerUser();
      const token = (await getUserByEmail(credentials.email)).confirmationToken;

      const res = await graphql({
        query: /* GraphQL */ `
          mutation ConfirmEmail($confirmation: String!) {
            emailConfirmation(confirmation: $confirmation) {
              jwt
              user {
                id
                email
              }
            }
          }
        `,
        variables: { confirmation: token },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.emailConfirmation).toMatchObject({
        jwt: expect.any(String),
        user: {
          id: expect.any(String),
          email: credentials.email,
        },
      });
    });

    test('returns a GraphQL error for an invalid token', async () => {
      const res = await graphql({
        query: /* GraphQL */ `
          mutation ConfirmEmail($confirmation: String!) {
            emailConfirmation(confirmation: $confirmation) {
              jwt
              user {
                id
              }
            }
          }
        `,
        variables: { confirmation: 'not-a-real-token' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toEqual({ emailConfirmation: null });
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Invalid token',
            path: ['emailConfirmation'],
          }),
        ])
      );
    });
  });
});
