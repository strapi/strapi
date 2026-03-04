'use strict';

import { createStrapiInstance, superAdmin } from 'api-tests/strapi';
import { createRequest } from 'api-tests/request';

describe('Admin Logout Sessions', () => {
  let strapi: any;

  const cookieName = 'strapi_admin_refresh';

  beforeAll(async () => {
    strapi = await createStrapiInstance({
      bootstrap: async ({ strapi: s }: any) => {
        s.config.set('admin.rateLimit.enabled', false);
      },
    });
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  const getCookie = (res: any, name: string): string | undefined => {
    const setCookies: string[] = res.headers['set-cookie'] || [];
    return setCookies.find((c) => c.startsWith(`${name}=`));
  };

  it('logout clears cookie even without refresh cookie present', async () => {
    // login and capture refresh cookie, then exchange for an access token
    const rq = createRequest({ strapi });
    let loginRes = await rq.post('/admin/login', { body: superAdmin.loginInfo });
    expect(loginRes.statusCode).toBe(200);

    const refreshCookie = getCookie(loginRes, cookieName)!;
    const cookiePair = refreshCookie.split(';')[0];

    const tokenRes = await createRequest({ strapi }).post('/admin/access-token', {
      headers: { Cookie: cookiePair },
    });
    expect(tokenRes.statusCode).toBe(200);
    const accessToken = tokenRes.body?.data?.token as string;

    // Use only Authorization header (no cookie) for logout
    const freshRq = createRequest({ strapi }).setToken(accessToken);
    const res = await freshRq.post('/admin/logout');
    expect(res.statusCode).toBe(200);

    const cookie = getCookie(res, cookieName);
    expect(cookie).toBeDefined();
    // expired cookie is set
    expect(cookie).toMatch(/expires=/i);
  });

  const deviceId = '22222222-2222-4222-8222-222222222222';
  const deviceId2 = '33333333-3333-4333-8333-333333333333';
  it('logout with deviceId revokes only that device sessions', async () => {
    const rq = createRequest({ strapi });

    // Login with specific device
    const body = { ...superAdmin.loginInfo, deviceId };
    const loginRes = await rq.post('/admin/login', { body });
    expect(loginRes.statusCode).toBe(200);

    const refreshSetCookie = getCookie(loginRes, cookieName)!;
    const cookiePair = refreshSetCookie.split(';')[0];

    // Create another session with different device
    const loginRes2 = await rq.post('/admin/login', {
      body: { ...superAdmin.loginInfo, deviceId: deviceId2 },
    });
    expect(loginRes2.statusCode).toBe(200);

    // Logout targeting first device
    const tokenRes = await createRequest({ strapi }).post('/admin/access-token', {
      headers: { Cookie: cookiePair },
    });
    const accessToken = tokenRes.body?.data?.token as string;

    const res = await createRequest({ strapi })
      .setToken(accessToken)
      .post('/admin/logout', { body: { deviceId } });
    expect(res.statusCode).toBe(200);

    // Verify sessions remaining belong only to the second device
    const sessions = await strapi.db.query('admin::session').findMany({});
    expect(sessions.some((s: any) => s.deviceId === deviceId)).toBe(false);
    expect(sessions.some((s: any) => s.deviceId === deviceId2)).toBe(true);
  });

  it('logout without deviceId revokes all devices', async () => {
    const rq = createRequest({ strapi });

    await rq.post('/admin/login', {
      body: { ...superAdmin.loginInfo, deviceId },
    });

    const loginResB = await rq.post('/admin/login', {
      body: { ...superAdmin.loginInfo, deviceId: deviceId2 },
    });

    // Obtain an access token
    expect(loginResB.statusCode).toBe(200);

    const maybeCookie = getCookie(loginResB, cookieName);

    let accessToken: string;
    const pair = maybeCookie!.split(';')[0];
    const tokenRes = await createRequest({ strapi }).post('/admin/access-token', {
      headers: { Cookie: pair },
    });
    expect(tokenRes.statusCode).toBe(200);
    accessToken = tokenRes.body?.data?.token as string;

    const res = await createRequest({ strapi }).setToken(accessToken).post('/admin/logout');
    expect(res.statusCode).toBe(200);

    // Derive userId from the access token payload
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(accessToken, strapi.config.get('admin.auth.secret')) as any;
    const userId = String(decoded.userId);

    const sessions = await strapi.db.query('admin::session').findMany({ where: { userId } });
    expect(sessions).toHaveLength(0);
  });

  it.todo(
    // TODO: not sure if we want to support this
    'logout with unknown deviceId returns 200 and does not revoke other sessions'

    //   async () => {
    //   const rq = createRequest({ strapi });

    //   const loginA = await rq.post('/admin/login', {
    //     body: { ...superAdmin.loginInfo, deviceId },
    //   });
    //   expect(loginA.statusCode).toBe(200);

    //   const loginB = await rq.post('/admin/login', {
    //     body: { ...superAdmin.loginInfo, deviceId: deviceId2 },
    //   });
    //   expect(loginB.statusCode).toBe(200);

    //   // Get an access token from one of the sessions (device B)
    //   const refreshCookie = getCookie(loginB, 'strapi_admin_refresh')!;
    //   const cookiePair = refreshCookie.split(';')[0];
    //   const tokenRes = await createRequest({ strapi }).post('/admin/access-token', {
    //     headers: { Cookie: cookiePair },
    //   });
    //   const accessToken = tokenRes.body?.data?.token as string;

    //   // Attempt logout with a deviceId that does not exist
    //   const unknownDeviceId = '66666666-6666-4666-8666-666666666666';
    //   const res = await createRequest({ strapi })
    //     // @ts-expect-error - chaining helper
    //     .setToken(accessToken)
    //     .post(`/admin/logout?deviceId=${unknownDeviceId}`);
    //   expect(res.statusCode).toBe(200);

    //   // Verify sessions for A and B still exist
    //   const sessions = await strapi.db.query('admin::session').findMany({});
    //   expect(sessions.some((s: any) => s.deviceId === deviceId)).toBe(true);
    //   expect(sessions.some((s: any) => s.deviceId === deviceId2)).toBe(true);
    // }
  );

  it('device B remains valid after device-scoped logout of device A', async () => {
    const rq = createRequest({ strapi });

    const deviceA = '77777777-7777-4777-8777-777777777777';
    const deviceB = '88888888-8888-4888-8888-888888888888';

    // Create A and B sessions
    const loginA = await rq.post('/admin/login', {
      body: { ...superAdmin.loginInfo, deviceId: deviceA },
    });
    expect(loginA.statusCode).toBe(200);
    const loginB = await rq.post('/admin/login', {
      body: { ...superAdmin.loginInfo, deviceId: deviceB },
    });
    expect(loginB.statusCode).toBe(200);

    // Access via device B
    const refreshCookieB = getCookie(loginB, 'strapi_admin_refresh')!;
    const cookiePairB = refreshCookieB.split(';')[0];
    const accessFromB = await createRequest({ strapi }).post('/admin/access-token', {
      headers: { Cookie: cookiePairB },
    });
    expect(accessFromB.statusCode).toBe(200);

    // Logout device A specifically
    const refreshCookieA = getCookie(loginA, 'strapi_admin_refresh')!;
    const cookiePairA = refreshCookieA.split(';')[0];
    const accessFromA = await createRequest({ strapi }).post('/admin/access-token', {
      headers: { Cookie: cookiePairA },
    });
    const accessTokenA = accessFromA.body?.data?.token as string;

    const logoutA = await createRequest({ strapi })
      .setToken(accessTokenA)
      .post('/admin/logout', {
        body: { deviceId: deviceA },
      });
    expect(logoutA.statusCode).toBe(200);

    // Device B should still be able to exchange and access protected route
    const newAccessFromB = await createRequest({ strapi }).post('/admin/access-token', {
      headers: { Cookie: cookiePairB },
    });
    expect(newAccessFromB.statusCode).toBe(200);
    const newAccessTokenB = newAccessFromB.body?.data?.token as string;

    const me = await createRequest({ strapi }).setToken(newAccessTokenB).get('/admin/users/me');
    expect(me.statusCode).toBe(200);
  });
});
