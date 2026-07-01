'use strict';

import { createStrapiInstance, superAdmin } from 'api-tests/strapi';
import { createRequest } from 'api-tests/request';
import { createUtils } from 'api-tests/utils';
import jwt from 'jsonwebtoken';

const SESSION_UID = 'admin::session';
const cookieName = 'strapi_admin_refresh';

describe('Admin Sessions Management (Active Devices)', () => {
  let strapi: any;
  let utils: any;

  beforeAll(async () => {
    strapi = await createStrapiInstance({
      bootstrap: async ({ strapi: s }: any) => {
        s.config.set('admin.rateLimit.enabled', false);
      },
    });
    utils = createUtils(strapi);
  });

  afterAll(async () => {
    await strapi.db.query(SESSION_UID).deleteMany({});
    await strapi.destroy();
  });

  afterEach(async () => {
    await strapi.db.query(SESSION_UID).deleteMany({});
  });

  const getCookie = (res: any, name: string): string | undefined => {
    const setCookies: string[] = res.headers['set-cookie'] || [];
    return setCookies.find((c) => c.startsWith(`${name}=`));
  };

  const secret = () => strapi.config.get('admin.auth.secret');

  /**
   * Logs in over HTTP (so metadata like loginAt/deviceName is captured), then exchanges the
   * refresh cookie for an access token. Returns the access token + the active sessionId.
   */
  const CHROME_UA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  const loginAndExchange = async (
    deviceId: string,
    creds: { email: string; password: string } = superAdmin.loginInfo
  ): Promise<{ accessToken: string; sessionId: string; userId: string }> => {
    const rq = createRequest({ strapi });
    const loginRes = await rq.post('/admin/login', {
      body: { ...creds, deviceId },
      headers: { 'User-Agent': CHROME_UA },
    });
    expect(loginRes.statusCode).toBe(200);

    const cookiePair = getCookie(loginRes, cookieName)!.split(';')[0];
    const tokenRes = await createRequest({ strapi }).post('/admin/access-token', {
      headers: { Cookie: cookiePair },
    });
    expect(tokenRes.statusCode).toBe(200);

    const accessToken = tokenRes.body?.data?.token as string;
    const decoded = jwt.verify(accessToken, secret()) as { userId: string; sessionId: string };

    return { accessToken, sessionId: decoded.sessionId, userId: String(decoded.userId) };
  };

  const deviceA = '11111111-1111-4111-8111-111111111111';
  const deviceB = '22222222-2222-4222-8222-222222222222';
  const deviceC = '33333333-3333-4333-8333-333333333333';

  describe('GET /admin/users/me/sessions', () => {
    it('requires authentication', async () => {
      const res = await createRequest({ strapi }).get('/admin/users/me/sessions');
      expect(res.statusCode).toBe(401);
    });

    it('lists active sessions and flags the current one with metadata', async () => {
      const { accessToken } = await loginAndExchange(deviceA);
      // A second device, not exchanged, stays active too.
      await createRequest({ strapi }).post('/admin/login', {
        body: { ...superAdmin.loginInfo, deviceId: deviceB },
      });

      const res = await createRequest({ strapi })
        .setToken(accessToken)
        .get('/admin/users/me/sessions');

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(2);

      const current = res.body.data.find((s: any) => s.current === true);
      const other = res.body.data.find((s: any) => s.current === false);

      expect(current).toBeDefined();
      expect(other).toBeDefined();

      // The list never leaks tokens or the userId.
      expect(current).not.toHaveProperty('userId');
      expect(current).not.toHaveProperty('token');

      // Metadata captured at HTTP login.
      expect(typeof current.id).toBe('string');
      expect(current.deviceId).toBe(deviceA);
      expect(typeof current.loginAt).toBe('string');
      expect(typeof current.lastActiveAt).toBe('string');
      // Device name is derived from the User-Agent sent at login and carried through rotation.
      expect(current.deviceName).toBe('Chrome on macOS');
      expect(other.deviceId).toBe(deviceB);

      for (const session of res.body.data) {
        expect(session).not.toHaveProperty('ip');
      }

      const [storedSession] = await strapi.db
        .query(SESSION_UID)
        .findMany({ where: { deviceId: deviceA, status: 'active' } });
      expect(storedSession?.metadata).toBeDefined();
      expect(storedSession.metadata).not.toHaveProperty('ip');
    });

    it('does not expose legacy ip metadata stored in the database', async () => {
      const { accessToken, sessionId } = await loginAndExchange(deviceA);

      await strapi.db.query(SESSION_UID).update({
        where: { sessionId },
        data: {
          metadata: {
            ip: '203.0.113.42',
            loginAt: new Date().toISOString(),
            deviceName: 'Chrome on macOS',
          },
        },
      });

      const res = await createRequest({ strapi })
        .setToken(accessToken)
        .get('/admin/users/me/sessions');

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).not.toHaveProperty('ip');
    });
  });

  describe('DELETE /admin/users/me/sessions/:sessionId', () => {
    it('revokes a specific (non-current) session', async () => {
      const { accessToken } = await loginAndExchange(deviceA);
      await createRequest({ strapi }).post('/admin/login', {
        body: { ...superAdmin.loginInfo, deviceId: deviceB },
      });

      const [sessionB] = await strapi.db
        .query(SESSION_UID)
        .findMany({ where: { deviceId: deviceB, status: 'active' } });
      expect(sessionB).toBeDefined();

      const res = await createRequest({ strapi })
        .setToken(accessToken)
        .delete(`/admin/users/me/sessions/${sessionB.sessionId}`);
      expect(res.statusCode).toBe(200);

      const remaining = await strapi.db
        .query(SESSION_UID)
        .findMany({ where: { deviceId: deviceB, status: 'active' } });
      expect(remaining).toHaveLength(0);

      // The current device is untouched.
      const list = await createRequest({ strapi })
        .setToken(accessToken)
        .get('/admin/users/me/sessions');
      expect(list.body.data).toHaveLength(1);
      expect(list.body.data[0].deviceId).toBe(deviceA);
    });

    it('returns 404 for an unknown session id', async () => {
      const { accessToken } = await loginAndExchange(deviceA);

      const res = await createRequest({ strapi })
        .setToken(accessToken)
        .delete('/admin/users/me/sessions/does-not-exist');
      expect(res.statusCode).toBe(404);
    });

    it('cannot revoke a session that belongs to another user', async () => {
      const { accessToken } = await loginAndExchange(deviceA);

      // Create a second admin and open a session for them.
      const password = 'Password123';
      const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const other = await utils.createUser({
        firstname: 'Other',
        lastname: 'Admin',
        email: `other-admin-${suffix}@strapi.io`,
        password,
        isActive: true,
      });

      const otherLogin = await createRequest({ strapi }).post('/admin/login', {
        body: { email: other.email, password, deviceId: deviceC },
      });
      expect(otherLogin.statusCode).toBe(200);

      const [otherSession] = await strapi.db
        .query(SESSION_UID)
        .findMany({ where: { userId: String(other.id), status: 'active' } });
      expect(otherSession).toBeDefined();

      // Attempt to revoke the other user's session with our token.
      const res = await createRequest({ strapi })
        .setToken(accessToken)
        .delete(`/admin/users/me/sessions/${otherSession.sessionId}`);
      expect(res.statusCode).toBe(404);

      // The other user's session is still present.
      const stillThere = await strapi.db
        .query(SESSION_UID)
        .findOne({ where: { sessionId: otherSession.sessionId } });
      expect(stillThere).not.toBeNull();

      await utils.deleteUserById(other.id);
    });
  });

  describe('DELETE /admin/users/me/sessions (revoke all)', () => {
    it('revokes every session of the current user (global logout)', async () => {
      const { accessToken, userId } = await loginAndExchange(deviceA);
      await createRequest({ strapi }).post('/admin/login', {
        body: { ...superAdmin.loginInfo, deviceId: deviceB },
      });
      await createRequest({ strapi }).post('/admin/login', {
        body: { ...superAdmin.loginInfo, deviceId: deviceC },
      });

      const res = await createRequest({ strapi })
        .setToken(accessToken)
        .delete('/admin/users/me/sessions');
      expect(res.statusCode).toBe(200);

      const sessions = await strapi.db.query(SESSION_UID).findMany({ where: { userId } });
      expect(sessions).toHaveLength(0);
    });

    it('keeps the current session when keepCurrent=true', async () => {
      const { accessToken, sessionId } = await loginAndExchange(deviceA);
      await createRequest({ strapi }).post('/admin/login', {
        body: { ...superAdmin.loginInfo, deviceId: deviceB },
      });
      await createRequest({ strapi }).post('/admin/login', {
        body: { ...superAdmin.loginInfo, deviceId: deviceC },
      });

      const res = await createRequest({ strapi })
        .setToken(accessToken)
        .delete('/admin/users/me/sessions', { qs: { keepCurrent: true } });
      expect(res.statusCode).toBe(200);

      const list = await createRequest({ strapi })
        .setToken(accessToken)
        .get('/admin/users/me/sessions');
      expect(list.statusCode).toBe(200);
      expect(list.body.data).toHaveLength(1);
      expect(list.body.data[0].id).toBe(sessionId);
      expect(list.body.data[0].current).toBe(true);
    });

    it('does not revoke sessions belonging to another user', async () => {
      const { accessToken, userId } = await loginAndExchange(deviceA);
      await createRequest({ strapi }).post('/admin/login', {
        body: { ...superAdmin.loginInfo, deviceId: deviceB },
      });

      const password = 'Password123';
      const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const other = await utils.createUser({
        firstname: 'Other',
        lastname: 'Admin',
        email: `other-admin-${suffix}@strapi.io`,
        password,
        isActive: true,
      });

      const otherLogin = await createRequest({ strapi }).post('/admin/login', {
        body: { email: other.email, password, deviceId: deviceC },
      });
      expect(otherLogin.statusCode).toBe(200);

      const cookiePair = getCookie(otherLogin, cookieName)!.split(';')[0];
      const otherTokenRes = await createRequest({ strapi }).post('/admin/access-token', {
        headers: { Cookie: cookiePair },
      });
      expect(otherTokenRes.statusCode).toBe(200);
      const otherAccessToken = otherTokenRes.body?.data?.token as string;

      const res = await createRequest({ strapi })
        .setToken(accessToken)
        .delete('/admin/users/me/sessions');
      expect(res.statusCode).toBe(200);

      const actorSessions = await strapi.db.query(SESSION_UID).findMany({ where: { userId } });
      expect(actorSessions).toHaveLength(0);

      const otherSessions = await strapi.db
        .query(SESSION_UID)
        .findMany({ where: { userId: String(other.id), status: 'active' } });
      expect(otherSessions).toHaveLength(1);

      const list = await createRequest({ strapi })
        .setToken(otherAccessToken)
        .get('/admin/users/me/sessions');
      expect(list.statusCode).toBe(200);
      expect(list.body.data).toHaveLength(1);

      await utils.deleteUserById(other.id);
    });
  });
});
