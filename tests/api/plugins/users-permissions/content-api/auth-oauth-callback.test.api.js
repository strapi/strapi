'use strict';

/* eslint-env jest */
/* eslint-disable import/no-extraneous-dependencies */

const { createStrapiInstance } = require('api-tests/strapi');
const { createRequest } = require('api-tests/request');

let strapi;

const enableOAuthProvider = async (provider) => {
  const store = strapi.store({ type: 'plugin', name: 'users-permissions' });
  const grant = (await store.get({ key: 'grant' })) || {};

  await store.set({
    key: 'grant',
    value: {
      ...grant,
      [provider]: {
        ...grant[provider],
        enabled: true,
      },
    },
  });
};

describe('OAuth auth callback', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance({ bypassAuth: false });
    await enableOAuthProvider('cognito');
    await enableOAuthProvider('google');
  });

  afterAll(async () => {
    await strapi.destroy();
    strapi = null;
  });

  test('rejects callback when grant session response is missing', async () => {
    const rqAuth = createRequest({ strapi }).setURLPrefix('/api/auth');

    const res = await rqAuth({
      method: 'GET',
      url: '/cognito/callback',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error.name).toBe('ApplicationError');
    expect(res.body.error.message).toBe(
      'OAuth authentication requires a completed provider session'
    );
  });

  test('rejects callback for other providers without a grant session', async () => {
    const rqAuth = createRequest({ strapi }).setURLPrefix('/api/auth');

    const res = await rqAuth({
      method: 'GET',
      url: '/google/callback',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error.name).toBe('ApplicationError');
    expect(res.body.error.message).toBe(
      'OAuth authentication requires a completed provider session'
    );
  });
});
