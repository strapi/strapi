'use strict';

const jwtLib = require('jsonwebtoken');
const { createStrapiInstance } = require('api-tests/strapi');
const { createRequest } = require('api-tests/request');
const { createAuthenticatedUser } = require('../utils');

let strapi;

const internals = {
  user: {
    username: 'sessions-user',
    email: 'sessions-user@strapi.io',
    password: 'Test1234',
    confirmed: true,
    provider: 'local',
  },
  otherUser: {
    username: 'sessions-other',
    email: 'sessions-other@strapi.io',
    password: 'Test1234',
    confirmed: true,
    provider: 'local',
  },
};

const createAuthRequest = () => createRequest({ strapi }).setURLPrefix('/api/auth');

const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const loginUser = async (userInfo = internals.user) => {
  return createAuthRequest()({
    method: 'POST',
    url: '/local',
    body: { identifier: userInfo.email, password: userInfo.password },
    headers: { 'User-Agent': CHROME_UA },
  });
};

const sessionIdFromToken = (token) => jwtLib.decode(token).sessionId;

const enableAuthRoute = async (s, routeName, roleType) => {
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

const recreateStrapiInstance = async ({ jwtManagement = 'refresh', enableRoutes = [] } = {}) => {
  if (strapi) {
    await strapi.destroy();
  }
  strapi = await createStrapiInstance({
    bypassAuth: false,
    async bootstrap({ strapi: s }) {
      s.config.set('plugin::users-permissions.jwtManagement', jwtManagement);
      s.config.set('plugin::users-permissions.sessions.httpOnly', false);
      s.config.set('plugin::users-permissions.ratelimit', { enabled: false });
      for (const { route, role } of enableRoutes) {
        await enableAuthRoute(s, route, role);
      }
    },
  });
};

describe('UP Content API - Active Sessions', () => {
  describe('refresh mode', () => {
    beforeAll(async () => {
      await recreateStrapiInstance({
        jwtManagement: 'refresh',
        enableRoutes: [
          { route: 'refresh', role: 'public' },
          { route: 'logout', role: 'authenticated' },
          { route: 'getSessions', role: 'authenticated' },
          { route: 'revokeSession', role: 'authenticated' },
        ],
      });

      await createAuthenticatedUser({ strapi, userInfo: internals.user });
      await createAuthenticatedUser({ strapi, userInfo: internals.otherUser });
    });

    afterAll(async () => {
      await strapi.db.query('plugin::users-permissions.user').deleteMany();
      await strapi.destroy();
      strapi = null;
    });

    it('GET /auth/sessions requires authentication', async () => {
      const res = await createAuthRequest()({ method: 'GET', url: '/sessions' });
      expect([401, 403]).toContain(res.statusCode);
    });

    it('lists the active sessions and flags the current one with metadata', async () => {
      const login1 = await loginUser();
      const login2 = await loginUser();
      expect(login1.statusCode).toBe(200);
      expect(login2.statusCode).toBe(200);

      const currentSessionId = sessionIdFromToken(login1.body.jwt);

      const res = await createAuthRequest().setToken(login1.body.jwt)({
        method: 'GET',
        url: '/sessions',
      });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      const current = res.body.data.find((s) => s.id === currentSessionId);
      expect(current).toBeDefined();
      expect(current.current).toBe(true);
      expect(typeof current.loginAt).toBe('string');
      expect(typeof current.ip).toBe('string');
      expect(current.deviceName).toBe('Chrome on macOS');
      expect(current).not.toHaveProperty('userId');

      // Clean up sessions created here.
      await strapi.db
        .query('admin::session')
        .deleteMany({ where: { origin: 'users-permissions' } });
    });

    it('revokes a specific session and prevents its refresh token from rotating', async () => {
      const login1 = await loginUser();
      const login2 = await loginUser();
      const targetSessionId = sessionIdFromToken(login2.body.jwt);

      const revokeRes = await createAuthRequest().setToken(login1.body.jwt)({
        method: 'DELETE',
        url: `/sessions/${targetSessionId}`,
      });
      expect(revokeRes.statusCode).toBe(200);

      // The revoked session's refresh token can no longer be rotated.
      const refreshRes = await createAuthRequest()({
        method: 'POST',
        url: '/refresh',
        body: { refreshToken: login2.body.refreshToken },
      });
      expect(refreshRes.statusCode).toBe(401);

      // Listing now only shows the surviving session.
      const list = await createAuthRequest().setToken(login1.body.jwt)({
        method: 'GET',
        url: '/sessions',
      });
      expect(list.body.data.some((s) => s.id === targetSessionId)).toBe(false);

      await strapi.db
        .query('admin::session')
        .deleteMany({ where: { origin: 'users-permissions' } });
    });

    it('returns 404 when revoking an unknown session id', async () => {
      const login1 = await loginUser();

      const res = await createAuthRequest().setToken(login1.body.jwt)({
        method: 'DELETE',
        url: '/sessions/unknown-session-id',
      });
      expect(res.statusCode).toBe(404);

      await strapi.db
        .query('admin::session')
        .deleteMany({ where: { origin: 'users-permissions' } });
    });

    it('cannot revoke a session that belongs to another user', async () => {
      const login1 = await loginUser();
      const otherLogin = await loginUser(internals.otherUser);
      const otherSessionId = sessionIdFromToken(otherLogin.body.jwt);

      const res = await createAuthRequest().setToken(login1.body.jwt)({
        method: 'DELETE',
        url: `/sessions/${otherSessionId}`,
      });
      expect(res.statusCode).toBe(404);

      // The other user's session is still valid (its refresh token can rotate).
      const refreshRes = await createAuthRequest()({
        method: 'POST',
        url: '/refresh',
        body: { refreshToken: otherLogin.body.refreshToken },
      });
      expect(refreshRes.statusCode).toBe(200);

      await strapi.db
        .query('admin::session')
        .deleteMany({ where: { origin: 'users-permissions' } });
    });
  });

  describe('legacy mode', () => {
    beforeAll(async () => {
      await recreateStrapiInstance({
        jwtManagement: 'legacy-support',
        enableRoutes: [{ route: 'getSessions', role: 'authenticated' }],
      });
      await createAuthenticatedUser({ strapi, userInfo: internals.user });
    });

    afterAll(async () => {
      await strapi.db.query('plugin::users-permissions.user').deleteMany();
      await strapi.destroy();
      strapi = null;
    });

    it('GET /auth/sessions returns 404 when not in refresh mode', async () => {
      const login = await loginUser();
      expect(login.statusCode).toBe(200);

      const res = await createAuthRequest().setToken(login.body.jwt)({
        method: 'GET',
        url: '/sessions',
      });
      expect(res.statusCode).toBe(404);
    });
  });
});
