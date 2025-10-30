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
    const rqAuth = createRequest({ strapi }).setURLPrefix('/api/auth');

    const res = await rqAuth({
      method: 'POST',
      url: '/local',
      body: { identifier: internals.user.email, password: internals.user.password },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.jwt).toEqual(expect.any(String));
    expect(res.body.refreshToken).toEqual(expect.any(String));
    const setCookie = res.headers['set-cookie'];
    expect(Array.isArray(setCookie) ? setCookie.join('\n') : String(setCookie || '')).not.toMatch(
      /strapi_up_refresh=/
    );
  });

  test('Per-request opt-in header sets cookie and omits refreshToken', async () => {
    const rqAuth = createRequest({ strapi }).setURLPrefix('/api/auth');

    const res = await rqAuth({
      method: 'POST',
      url: '/local',
      headers: { 'x-strapi-refresh-cookie': 'httpOnly' },
      body: { identifier: internals.user.email, password: internals.user.password },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.jwt).toEqual(expect.any(String));
    expect(res.body.refreshToken).toBeUndefined();
    const setCookie = res.headers['set-cookie'];
    const cookies = Array.isArray(setCookie) ? setCookie.join('\n') : String(setCookie || '');
    expect(cookies).toMatch(/strapi_up_refresh=/);
    expect(cookies.toLowerCase()).toMatch(/httponly/);
  });

  test('Config httpOnly=true: always sets cookie and omits refreshToken', async () => {
    await strapi.destroy();
    strapi = await createStrapiInstance({
      bypassAuth: false,
      async bootstrap({ strapi: s }) {
        s.config.set('plugin::users-permissions.jwtManagement', 'refresh');
        s.config.set('plugin::users-permissions.sessions.httpOnly', true);
      },
    });

    const rqAuth = createRequest({ strapi }).setURLPrefix('/api/auth');

    // Ensure user exists in this new instance
    await createAuthenticatedUser({ strapi, userInfo: internals.user });

    const res = await rqAuth({
      method: 'POST',
      url: '/local',
      body: { identifier: internals.user.email, password: internals.user.password },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.jwt).toEqual(expect.any(String));
    expect(res.body.refreshToken).toBeUndefined();
    const setCookie = res.headers['set-cookie'];
    const cookies = Array.isArray(setCookie) ? setCookie.join('\n') : String(setCookie || '');
    expect(cookies).toMatch(/strapi_up_refresh=/);
    expect(cookies.toLowerCase()).toMatch(/httponly/);
  });

  describe('Change Password (refresh mode responses)', () => {
    beforeAll(async () => {
      await strapi.destroy();
      strapi = await createStrapiInstance({
        bypassAuth: false,
        async bootstrap({ strapi: s }) {
          s.config.set('plugin::users-permissions.jwtManagement', 'refresh');
          s.config.set('plugin::users-permissions.sessions.httpOnly', false);
        },
      });

      // Ensure user exists
      await createAuthenticatedUser({ strapi, userInfo: internals.user });
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
      const rqAuthLogin = createRequest({ strapi }).setURLPrefix('/api/auth');

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
      const loginRes = await rqAuthLogin({
        method: 'POST',
        url: '/local',
        body: { identifier: isolatedUser.email, password: isolatedUser.password },
      });

      expect(loginRes.statusCode).toBe(200);
      const jwt = loginRes.body.jwt;

      const rqAuth = createRequest({ strapi }).setURLPrefix('/api/auth').setToken(jwt);

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
      const relogin = await rqAuthLogin({
        method: 'POST',
        url: '/local',
        body: { identifier: isolatedUser.email, password: newPassword },
      });
      expect(relogin.statusCode).toBe(200);
    });

    test('Fails on invalid confirm password', async () => {
      const rqAuthLogin = createRequest({ strapi }).setURLPrefix('/api/auth');
      const loginRes = await rqAuthLogin({
        method: 'POST',
        url: '/local',
        body: { identifier: internals.user.email, password: internals.user.password },
      });
      const jwt = loginRes.body.jwt;

      const rqAuth = createRequest({ strapi }).setURLPrefix('/api/auth').setToken(jwt);
      const res = await rqAuth({
        method: 'POST',
        url: '/change-password',
        body: {
          password: 'newPassword',
          passwordConfirmation: 'somethingElse',
          currentPassword: 'Test12345!',
        },
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error.name).toBe('ValidationError');
      expect(res.body.error.message).toBe('Passwords do not match');
    });

    test('Fails on invalid current password', async () => {
      const rqAuthLogin = createRequest({ strapi }).setURLPrefix('/api/auth');
      const loginRes = await rqAuthLogin({
        method: 'POST',
        url: '/local',
        body: { identifier: internals.user.email, password: internals.user.password },
      });
      const jwt = loginRes.body.jwt;

      const rqAuth = createRequest({ strapi }).setURLPrefix('/api/auth').setToken(jwt);
      const res = await rqAuth({
        method: 'POST',
        url: '/change-password',
        body: {
          password: 'newPassword',
          passwordConfirmation: 'newPassword',
          currentPassword: 'badPassword',
        },
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error.name).toBe('ValidationError');
      expect(res.body.error.message).toBe('The provided current password is invalid');
    });

    test('Fails when current and new password are the same', async () => {
      const rqAuthLogin = createRequest({ strapi }).setURLPrefix('/api/auth');
      const loginRes = await rqAuthLogin({
        method: 'POST',
        url: '/local',
        body: { identifier: internals.user.email, password: internals.user.password },
      });
      const jwt = loginRes.body.jwt;

      const rqAuth = createRequest({ strapi }).setURLPrefix('/api/auth').setToken(jwt);
      const res = await rqAuth({
        method: 'POST',
        url: '/change-password',
        body: {
          password: internals.user.password,
          passwordConfirmation: internals.user.password,
          currentPassword: internals.user.password,
        },
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error.name).toBe('ValidationError');
      expect(res.body.error.message).toBe(
        'Your new password must be different than your current password'
      );
    });
  });

  describe('Refresh endpoint', () => {
    beforeAll(async () => {
      await strapi.destroy();
      strapi = await createStrapiInstance({
        bypassAuth: false,
        async bootstrap({ strapi: s }) {
          s.config.set('plugin::users-permissions.jwtManagement', 'refresh');
          s.config.set('plugin::users-permissions.sessions.httpOnly', false);

          // Enable public permission for refresh route
          const publicRole = await s.db
            .query('plugin::users-permissions.role')
            .findOne({ where: { type: 'public' } });
          const roleService = s.service('plugin::users-permissions.role');
          const publicRoleDetails = await roleService.findOne(publicRole.id);
          publicRoleDetails.permissions['plugin::users-permissions'] = publicRoleDetails
            .permissions['plugin::users-permissions'] || { controllers: {} };
          const controllers =
            publicRoleDetails.permissions['plugin::users-permissions'].controllers || {};
          const authCtrl = controllers.auth || {};
          authCtrl.refresh = { enabled: true, policy: '' };
          publicRoleDetails.permissions['plugin::users-permissions'].controllers = {
            ...controllers,
            auth: authCtrl,
          };
          await roleService.updateRole(publicRole.id, {
            permissions: publicRoleDetails.permissions,
          });
        },
      });
      await createAuthenticatedUser({ strapi, userInfo: internals.user });
    });
    test('Missing refresh token returns 400 (public route)', async () => {
      const rqAuth = createRequest({ strapi }).setURLPrefix('/api/auth');

      const res = await rqAuth({ method: 'POST', url: '/refresh', body: {} });
      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toBe('Missing refresh token');
    });

    test('Invalid refresh token returns 401', async () => {
      const rqAuth = createRequest({ strapi }).setURLPrefix('/api/auth');

      const res = await rqAuth({
        method: 'POST',
        url: '/refresh',
        body: { refreshToken: 'not-a-valid-token' },
      });
      expect(res.statusCode).toBe(401);
      expect(res.body.error.message).toBe('Invalid refresh token');
    });

    test('Success returns new jwt and rotated refreshToken in JSON by default', async () => {
      const rqAuth = createRequest({ strapi }).setURLPrefix('/api/auth');

      // Login to get a refresh token (default httpOnly=false)
      const loginRes = await rqAuth({
        method: 'POST',
        url: '/local',
        body: { identifier: internals.user.email, password: internals.user.password },
      });
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
      const rqAuth = createRequest({ strapi }).setURLPrefix('/api/auth');

      // Login to get a refresh token first
      const loginRes = await rqAuth({
        method: 'POST',
        url: '/local',
        body: { identifier: internals.user.email, password: internals.user.password },
      });
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
      const setCookie = res.headers['set-cookie'];
      const cookies = Array.isArray(setCookie) ? setCookie.join('\n') : String(setCookie || '');
      expect(cookies).toMatch(/strapi_up_refresh=/);
      expect(cookies.toLowerCase()).toMatch(/httponly/);
    });

    test('Even with cookie set, missing body yields 400', async () => {
      const rqAuth = createRequest({ strapi }).setURLPrefix('/api/auth');

      const loginRes = await rqAuth({
        method: 'POST',
        url: '/local',
        headers: { 'x-strapi-refresh-cookie': 'httpOnly' },
        body: { identifier: internals.user.email, password: 'Test12345!' },
      });
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
      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toBe('Missing refresh token');
    });
  });

  describe('Logout endpoint', () => {
    beforeAll(async () => {
      await strapi.destroy();
      strapi = await createStrapiInstance({
        bypassAuth: false,
        async bootstrap({ strapi: s }) {
          s.config.set('plugin::users-permissions.jwtManagement', 'refresh');
          s.config.set('plugin::users-permissions.sessions.httpOnly', false);
          // Disable rate limiting for auth routes in this suite to avoid 429s
          s.config.set('plugin::users-permissions.ratelimit', { enabled: false });

          // Enable authenticated permission for logout and public for refresh (used later)
          const roleService = s.service('plugin::users-permissions.role');
          const publicRole = await s.db
            .query('plugin::users-permissions.role')
            .findOne({ where: { type: 'public' } });
          const authenticatedRole = await s.db
            .query('plugin::users-permissions.role')
            .findOne({ where: { type: 'authenticated' } });

          const publicRoleDetails = await roleService.findOne(publicRole.id);
          publicRoleDetails.permissions['plugin::users-permissions'] = publicRoleDetails
            .permissions['plugin::users-permissions'] || { controllers: {} };
          const pubControllers =
            publicRoleDetails.permissions['plugin::users-permissions'].controllers || {};
          const pubAuthCtrl = pubControllers.auth || {};
          pubAuthCtrl.refresh = { enabled: true, policy: '' };
          publicRoleDetails.permissions['plugin::users-permissions'].controllers = {
            ...pubControllers,
            auth: pubAuthCtrl,
          };
          await roleService.updateRole(publicRole.id, {
            permissions: publicRoleDetails.permissions,
          });

          const authRoleDetails = await roleService.findOne(authenticatedRole.id);
          authRoleDetails.permissions['plugin::users-permissions'] = authRoleDetails.permissions[
            'plugin::users-permissions'
          ] || { controllers: {} };
          const authControllers =
            authRoleDetails.permissions['plugin::users-permissions'].controllers || {};
          const authAuthCtrl = authControllers.auth || {};
          authAuthCtrl.logout = { enabled: true, policy: '' };
          authRoleDetails.permissions['plugin::users-permissions'].controllers = {
            ...authControllers,
            auth: authAuthCtrl,
          };
          await roleService.updateRole(authenticatedRole.id, {
            permissions: authRoleDetails.permissions,
          });
        },
      });
      await createAuthenticatedUser({ strapi, userInfo: internals.user });
    });
    test('Requires authentication', async () => {
      const rqAuth = createRequest({ strapi }).setURLPrefix('/api/auth');
      const res = await rqAuth({ method: 'POST', url: '/logout', body: {} });
      expect([401, 403]).toContain(res.statusCode);
      if (res.statusCode === 401) {
        expect(res.body.error.message).toBe('Missing authentication');
      }
    });

    test('Authenticated logout responds ok and clears cookie when requested', async () => {
      const rqAuth = createRequest({ strapi }).setURLPrefix('/api/auth');

      // Login to get access jwt
      const loginRes = await rqAuth({
        method: 'POST',
        url: '/local',
        body: { identifier: internals.user.email, password: internals.user.password },
      });
      expect(loginRes.statusCode).toBe(200);
      const jwt = loginRes.body.jwt;
      expect(typeof jwt).toBe('string');

      const rqAuthed = createRequest({ strapi }).setURLPrefix('/api/auth');

      const res = await rqAuthed({
        method: 'POST',
        url: '/logout',
        headers: { 'x-strapi-refresh-cookie': 'httpOnly', Authorization: `Bearer ${jwt}` },
        body: {},
      });
      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({ ok: true });
      const setCookie = res.headers['set-cookie'];
      const cookies = Array.isArray(setCookie) ? setCookie.join('\n') : String(setCookie || '');
      expect(cookies).toMatch(/strapi_up_refresh=;/);
    });

    test('Logout invalidates refresh token', async () => {
      const rqAuth = createRequest({ strapi }).setURLPrefix('/api/auth');

      // Login to get jwt and refresh token
      const loginRes = await rqAuth({
        method: 'POST',
        url: '/local',
        body: { identifier: internals.user.email, password: internals.user.password },
      });
      expect(loginRes.statusCode).toBe(200);
      const jwt = loginRes.body.jwt;
      const refreshToken = loginRes.body.refreshToken;
      expect(typeof jwt).toBe('string');
      expect(typeof refreshToken).toBe('string');

      // Logout
      const rqAuthed = createRequest({ strapi }).setURLPrefix('/api/auth');
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
