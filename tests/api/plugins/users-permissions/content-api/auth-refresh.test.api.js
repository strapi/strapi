'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createRequest } = require('api-tests/request');
const { createAuthenticatedUser } = require('../utils');

let strapi;

const internals = {
  user: {
    username: 'test-refresh',
    email: 'test-refresh@strapi.io',
    password: 'Test1234',
    confirmed: true,
    provider: 'local',
  },
};

const parseCookies = (res) => {
  const setCookie = res.headers['set-cookie'];
  return Array.isArray(setCookie) ? setCookie.join('\n') : String(setCookie || '');
};

const expectHttpOnlyCookie = (res) => {
  const cookies = parseCookies(res);
  expect(cookies).toMatch(/strapi_up_refresh=/);
  expect(cookies.toLowerCase()).toMatch(/httponly/);
};

const expectNoCookie = (res) => {
  const cookies = parseCookies(res);
  expect(cookies).not.toMatch(/strapi_up_refresh=/);
};

const createAuthRequest = () => createRequest({ strapi }).setURLPrefix('/api/auth');

const createAuthRequestWithToken = (jwt) => createAuthRequest().setToken(jwt);

const loginUser = async (userInfo = internals.user, headers = {}) => {
  return createAuthRequest()({
    method: 'POST',
    url: '/local',
    headers,
    body: { identifier: userInfo.email, password: userInfo.password },
  });
};

const loginAndGetAuthRequest = async (userInfo = internals.user) => {
  const loginRes = await loginUser(userInfo);
  return { loginRes, rqAuth: createAuthRequestWithToken(loginRes.body.jwt) };
};

const enableAuthRoute = async (s, routeName, roleType = 'public') => {
  const role = await s.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: roleType } });
  const roleService = s.service('plugin::users-permissions.role');
  const roleDetails = await roleService.findOne(role.id);

  roleDetails.permissions['plugin::users-permissions'] = roleDetails.permissions[
    'plugin::users-permissions'
  ] || { controllers: {} };
  const controllers = roleDetails.permissions['plugin::users-permissions'].controllers || {};
  const authCtrl = controllers.auth || {};
  authCtrl[routeName] = { enabled: true, policy: '' };
  roleDetails.permissions['plugin::users-permissions'].controllers = {
    ...controllers,
    auth: authCtrl,
  };

  await roleService.updateRole(role.id, { permissions: roleDetails.permissions });
};

const recreateStrapiInstance = async (config = {}) => {
  await strapi.destroy();
  strapi = await createStrapiInstance({
    bypassAuth: false,
    async bootstrap({ strapi: s }) {
      s.config.set('plugin::users-permissions.jwtManagement', 'refresh');
      s.config.set('plugin::users-permissions.sessions.httpOnly', config.httpOnly ?? false);
      if (config.disableRateLimit) {
        s.config.set('plugin::users-permissions.ratelimit', { enabled: false });
      }
      if (config.enableRoutes) {
        for (const { route, role } of config.enableRoutes) {
          await enableAuthRoute(s, route, role);
        }
      }
    },
  });
  await createAuthenticatedUser({ strapi, userInfo: internals.user });
};

describe('Auth API (refresh mode httpOnly behaviour)', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance({
      bypassAuth: false,
      async bootstrap({ strapi: s }) {
        s.config.set('plugin::users-permissions.jwtManagement', 'refresh');
        s.config.set('plugin::users-permissions.sessions.httpOnly', false);
      },
    });

    await createAuthenticatedUser({ strapi, userInfo: internals.user });
  });

  afterAll(async () => {
    await strapi.db.query('plugin::users-permissions.user').deleteMany();
    await strapi.destroy();
  });

  test('Default (httpOnly=false): returns jwt and refreshToken in JSON, no cookie set', async () => {
    const res = await loginUser();

    expect(res.statusCode).toBe(200);
    expect(res.body.jwt).toEqual(expect.any(String));
    expect(res.body.refreshToken).toEqual(expect.any(String));
    expectNoCookie(res);
  });

  test('Per-request opt-in header sets cookie and omits refreshToken', async () => {
    const res = await loginUser(internals.user, { 'x-strapi-refresh-cookie': 'httpOnly' });

    expect(res.statusCode).toBe(200);
    expect(res.body.jwt).toEqual(expect.any(String));
    expect(res.body.refreshToken).toBeUndefined();
    expectHttpOnlyCookie(res);
  });

  test('Config httpOnly=true: always sets cookie and omits refreshToken', async () => {
    await recreateStrapiInstance({ httpOnly: true });

    const res = await loginUser();

    expect(res.statusCode).toBe(200);
    expect(res.body.jwt).toEqual(expect.any(String));
    expect(res.body.refreshToken).toBeUndefined();
    expectHttpOnlyCookie(res);
  });

  describe('Change Password (refresh mode responses)', () => {
    beforeAll(async () => {
      await recreateStrapiInstance();
    });
    test('Fails on unauthenticated request', async () => {
      const nonAuthRequest = createRequest({ strapi });

      const res = await nonAuthRequest({
        method: 'POST',
        url: '/api/auth/change-password',
        body: {},
      });

      expect(res.statusCode).toBe(403);
      expect(res.body.error.name).toBe('ForbiddenError');
      expect(res.body.error.message).toBe('Forbidden');
    });

    test('Returns jwt and refreshToken after successful password change', async () => {
      // Create an isolated user for this test to avoid impacting other tests
      const isolatedUser = {
        username: 'test-refresh-change',
        email: 'test-refresh-change@strapi.io',
        password: 'Change1234!',
        confirmed: true,
        provider: 'local',
      };
      await createAuthenticatedUser({ strapi, userInfo: isolatedUser });

      // Login to obtain a valid jwt to perform change-password
      const loginRes = await loginUser(isolatedUser);

      expect(loginRes.statusCode).toBe(200);
      const jwt = loginRes.body.jwt;

      const rqAuth = createAuthRequestWithToken(jwt);

      const newPassword = 'Change12345!';
      const res = await rqAuth({
        method: 'POST',
        url: '/change-password',
        body: {
          password: newPassword,
          passwordConfirmation: newPassword,
          currentPassword: isolatedUser.password,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.jwt).toEqual(expect.any(String));
      expect(res.body.refreshToken).toEqual(expect.any(String));

      // Can login with the new password afterwards
      const relogin = await loginUser({ ...isolatedUser, password: newPassword });
      expect(relogin.statusCode).toBe(200);
    });

    test.each([
      {
        name: 'invalid confirm password',
        body: {
          password: 'newPassword',
          passwordConfirmation: 'somethingElse',
          currentPassword: 'Test12345!',
        },
        expectedMessage: 'Passwords do not match',
      },
      {
        name: 'invalid current password',
        body: {
          password: 'newPassword',
          passwordConfirmation: 'newPassword',
          currentPassword: 'badPassword',
        },
        expectedMessage: 'The provided current password is invalid',
      },
      {
        name: 'current and new password are the same',
        body: {
          password: 'Test1234',
          passwordConfirmation: 'Test1234',
          currentPassword: 'Test1234',
        },
        expectedMessage: 'Your new password must be different than your current password',
      },
    ])('Fails on $name', async ({ body, expectedMessage }) => {
      const { rqAuth } = await loginAndGetAuthRequest();
      const res = await rqAuth({ method: 'POST', url: '/change-password', body });
      expect(res.statusCode).toBe(400);
      expect(res.body.error.name).toBe('ValidationError');
      expect(res.body.error.message).toBe(expectedMessage);
    });
  });

  describe('Refresh endpoint', () => {
    beforeAll(async () => {
      await recreateStrapiInstance({
        disableRateLimit: true,
        enableRoutes: [{ route: 'refresh', role: 'public' }],
      });
    });
    test('Missing refresh token returns 400 (public route)', async () => {
      const rqAuth = createAuthRequest();

      const res = await rqAuth({ method: 'POST', url: '/refresh', body: {} });
      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toBe('Missing refresh token');
    });

    test('Invalid refresh token returns 401', async () => {
      const rqAuth = createAuthRequest();

      const res = await rqAuth({
        method: 'POST',
        url: '/refresh',
        body: { refreshToken: 'not-a-valid-token' },
      });
      expect(res.statusCode).toBe(401);
      expect(res.body.error.message).toBe('Invalid refresh token');
    });

    test('Success returns new jwt and rotated refreshToken in JSON by default', async () => {
      const rqAuth = createAuthRequest();

      // Login to get a refresh token (default httpOnly=false)
      const loginRes = await loginUser();
      expect(loginRes.statusCode).toBe(200);
      const initialRefresh = loginRes.body.refreshToken;
      expect(initialRefresh).toEqual(expect.any(String));

      const refreshRes = await rqAuth({
        method: 'POST',
        url: '/refresh',
        body: { refreshToken: initialRefresh },
      });
      expect(refreshRes.statusCode).toBe(200);
      expect(refreshRes.body.jwt).toEqual(expect.any(String));
      expect(refreshRes.body.refreshToken).toEqual(expect.any(String));
      expect(refreshRes.body.refreshToken).not.toBe(initialRefresh);
    });

    test('With httpOnly header, sets cookie and omits refreshToken in body', async () => {
      const rqAuth = createAuthRequest();

      // Login to get a refresh token first
      const loginRes = await loginUser();
      const initialRefresh = loginRes.body.refreshToken;

      const res = await rqAuth({
        method: 'POST',
        url: '/refresh',
        headers: { 'x-strapi-refresh-cookie': 'httpOnly' },
        body: { refreshToken: initialRefresh },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.jwt).toEqual(expect.any(String));
      expect(res.body.refreshToken).toBeUndefined();
      expectHttpOnlyCookie(res);
    });

    test('Cookie-based refresh works when httpOnly is configured', async () => {
      const rqAuth = createAuthRequest();

      const loginRes = await loginUser(internals.user, { 'x-strapi-refresh-cookie': 'httpOnly' });
      const setCookie = loginRes.headers['set-cookie'];
      const cookieHeader = Array.isArray(setCookie) ? setCookie : [setCookie];

      const res = await rqAuth({
        method: 'POST',
        url: '/refresh',
        headers: {
          Cookie: cookieHeader.filter(Boolean).join('; '),
          'x-strapi-refresh-cookie': 'httpOnly',
        },
        body: {},
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.jwt).toEqual(expect.any(String));
      expect(res.body.refreshToken).toBeUndefined();
      expectHttpOnlyCookie(res);
    });
  });

  describe('Logout endpoint', () => {
    beforeAll(async () => {
      await recreateStrapiInstance({
        disableRateLimit: true,
        enableRoutes: [
          { route: 'refresh', role: 'public' },
          { route: 'logout', role: 'authenticated' },
        ],
      });
    });
    test('Requires authentication', async () => {
      const rqAuth = createAuthRequest();
      const res = await rqAuth({ method: 'POST', url: '/logout', body: {} });
      expect([401, 403]).toContain(res.statusCode);
      if (res.statusCode === 401) {
        expect(res.body.error.message).toBe('Missing authentication');
      }
    });

    test('Authenticated logout responds ok and clears cookie when requested', async () => {
      // Login to get access jwt
      const loginRes = await loginUser();
      expect(loginRes.statusCode).toBe(200);
      const jwt = loginRes.body.jwt;
      expect(typeof jwt).toBe('string');

      const rqAuthed = createAuthRequest();

      const res = await rqAuthed({
        method: 'POST',
        url: '/logout',
        headers: { 'x-strapi-refresh-cookie': 'httpOnly', Authorization: `Bearer ${jwt}` },
        body: {},
      });
      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({ ok: true });
      const cookies = parseCookies(res);
      expect(cookies).toMatch(/strapi_up_refresh=;/);
    });

    test('Logout invalidates refresh token', async () => {
      const rqAuth = createAuthRequest();

      // Login to get jwt and refresh token
      const loginRes = await loginUser();
      expect(loginRes.statusCode).toBe(200);
      const jwt = loginRes.body.jwt;
      const refreshToken = loginRes.body.refreshToken;
      expect(typeof jwt).toBe('string');
      expect(typeof refreshToken).toBe('string');

      // Logout
      const rqAuthed = createAuthRequest();
      const logoutRes = await rqAuthed({
        method: 'POST',
        url: '/logout',
        headers: { Authorization: `Bearer ${jwt}` },
        body: {},
      });
      expect(logoutRes.statusCode).toBe(200);

      // Attempt to refresh with the old token should fail
      const refreshRes = await rqAuth({
        method: 'POST',
        url: '/refresh',
        body: { refreshToken },
      });
      expect(refreshRes.statusCode).toBe(401);
      expect(refreshRes.body.error.message).toBe('Invalid refresh token');
    });
  });
});
