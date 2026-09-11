'use strict';

import { createStrapiInstance, superAdmin } from 'api-tests/strapi';
import { createRequest } from 'api-tests/request';
import jwt from 'jsonwebtoken';

describe('Admin Access Token Exchange', () => {
  let strapi: any;

  const cookieName = 'strapi_admin_refresh';

  const decode = (token: string): any => {
    const secret = strapi.config.get('admin.auth.secret');
    return jwt.verify(token, secret);
  };

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

  it('returns 200 with an access token when using refresh cookie', async () => {
    const rq = createRequest({ strapi });

    // login and capture refresh cookie
    const loginRes = await rq.post('/admin/login', { body: superAdmin.loginInfo });
    expect(loginRes.statusCode).toBe(200);

    const setCookies: string[] = loginRes.headers['set-cookie'] || [];
    const refreshCookie = setCookies.find((c) => c.startsWith(`strapi_admin_refresh=`));
    expect(refreshCookie).toBeDefined();

    const cookiePair = refreshCookie!.split(';')[0];

    const cookieRq = createRequest({ strapi });

    // Forward the cookie header explicitly.
    const res = await cookieRq.post('/admin/access-token', { headers: { Cookie: cookiePair } });
    expect(res.statusCode).toBe(200);

    const token = res.body?.data?.token;
    expect(token).toEqual(expect.any(String));

    const payload = decode(token);
    expect(payload).toMatchObject({
      type: 'access',
      userId: expect.any(String),
      sessionId: expect.any(String),
    });
  });

  it('child refresh cookie still works after parent rotation (multi-tab recovery path)', async () => {
    const rq = createRequest({ strapi });

    const loginRes = await rq.post('/admin/login', { body: superAdmin.loginInfo });
    expect(loginRes.statusCode).toBe(200);

    const originalCookiePair = getCookie(loginRes, cookieName)!.split(';')[0];

    const firstExchangeRes = await createRequest({ strapi }).post('/admin/access-token', {
      headers: { Cookie: originalCookiePair },
    });
    expect(firstExchangeRes.statusCode).toBe(200);

    const childCookiePair = getCookie(firstExchangeRes, cookieName)!.split(';')[0];
    expect(childCookiePair).not.toBe(originalCookiePair);

    // Parent replay is rejected (security fix).
    const replayRes = await createRequest({ strapi }).post('/admin/access-token', {
      headers: { Cookie: originalCookiePair },
    });
    expect(replayRes.statusCode).toBe(401);

    // A tab that lost the race can still refresh using the shared child cookie.
    const childExchangeRes = await createRequest({ strapi }).post('/admin/access-token', {
      headers: { Cookie: childCookiePair },
    });
    expect(childExchangeRes.statusCode).toBe(200);
    expect(childExchangeRes.body?.data?.token).toEqual(expect.any(String));
  });

  it('concurrent access-token with same parent: one wins, loser gets 401, child cookie still valid', async () => {
    const rq = createRequest({ strapi });

    const loginRes = await rq.post('/admin/login', { body: superAdmin.loginInfo });
    expect(loginRes.statusCode).toBe(200);

    const parentCookiePair = getCookie(loginRes, cookieName)!.split(';')[0];

    const [firstRes, secondRes] = await Promise.all([
      createRequest({ strapi }).post('/admin/access-token', {
        headers: { Cookie: parentCookiePair },
      }),
      createRequest({ strapi }).post('/admin/access-token', {
        headers: { Cookie: parentCookiePair },
      }),
    ]);

    const statuses = [firstRes.statusCode, secondRes.statusCode].sort();
    expect(statuses).toEqual([200, 401]);

    const winner = firstRes.statusCode === 200 ? firstRes : secondRes;
    const loser = firstRes.statusCode === 200 ? secondRes : firstRes;
    expect(loser.statusCode).toBe(401);

    const childCookiePair = getCookie(winner, cookieName)!.split(';')[0];
    expect(childCookiePair).not.toBe(parentCookiePair);

    // Simulates the client retry after 401: browser now shares the child cookie.
    const recoveryRes = await createRequest({ strapi }).post('/admin/access-token', {
      headers: { Cookie: childCookiePair },
    });
    expect(recoveryRes.statusCode).toBe(200);
    expect(recoveryRes.body?.data?.token).toEqual(expect.any(String));
  });

  it('rejects a stale parent cookie on repeated access-token attempts (no replay window)', async () => {
    const rq = createRequest({ strapi });

    const loginRes = await rq.post('/admin/login', { body: superAdmin.loginInfo });
    expect(loginRes.statusCode).toBe(200);

    const parentCookiePair = getCookie(loginRes, cookieName)!.split(';')[0];

    const firstExchangeRes = await createRequest({ strapi }).post('/admin/access-token', {
      headers: { Cookie: parentCookiePair },
    });
    expect(firstExchangeRes.statusCode).toBe(200);

    const replayAttempts = await Promise.all([
      createRequest({ strapi }).post('/admin/access-token', {
        headers: { Cookie: parentCookiePair },
      }),
      createRequest({ strapi }).post('/admin/access-token', {
        headers: { Cookie: parentCookiePair },
      }),
    ]);

    replayAttempts.forEach((res) => expect(res.statusCode).toBe(401));
  });

  it('returns 401 when replaying an already rotated refresh cookie', async () => {
    const rq = createRequest({ strapi });

    const loginRes = await rq.post('/admin/login', { body: superAdmin.loginInfo });
    expect(loginRes.statusCode).toBe(200);

    const refreshCookie = getCookie(loginRes, cookieName);
    expect(refreshCookie).toBeDefined();

    const originalCookiePair = refreshCookie!.split(';')[0];

    const firstExchangeRes = await createRequest({ strapi }).post('/admin/access-token', {
      headers: { Cookie: originalCookiePair },
    });
    expect(firstExchangeRes.statusCode).toBe(200);
    expect(firstExchangeRes.body?.data?.token).toEqual(expect.any(String));

    const rotatedCookie = getCookie(firstExchangeRes, cookieName);
    expect(rotatedCookie).toBeDefined();
    expect(rotatedCookie!.split(';')[0]).not.toBe(originalCookiePair);

    const replayRes = await createRequest({ strapi }).post('/admin/access-token', {
      headers: { Cookie: originalCookiePair },
    });
    expect(replayRes.statusCode).toBe(401);
  });

  it('returns 401 for missing token (no cookie and no body)', async () => {
    const rq = createRequest({ strapi });
    const res = await rq.post('/admin/access-token');

    expect(res.statusCode).toBe(401);
  });

  it('returns 401 when idle window elapsed since parent token creation', async () => {
    const rq = createRequest({ strapi });
    const loginRes = await rq.post('/admin/login', { body: superAdmin.loginInfo });
    expect(loginRes.statusCode).toBe(200);

    const refreshCookie = getCookie(loginRes, cookieName)!;
    const pair = refreshCookie.split(';')[0];
    const refreshToken = pair.split('=')[1];

    const payload = decode(refreshToken);
    const sessionId = payload.sessionId as string;

    await strapi.db.query('admin::session').update({
      where: { sessionId },
      data: { createdAt: new Date(Date.now() - (7 * 24 * 60 * 60 * 1000 + 60 * 1000)) },
    });

    const res = await createRequest({ strapi }).post('/admin/access-token', {
      headers: { Cookie: pair },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 when max family window elapsed', async () => {
    const rq = createRequest({ strapi });
    const loginRes = await rq.post('/admin/login', { body: superAdmin.loginInfo });
    expect(loginRes.statusCode).toBe(200);

    const refreshCookie = getCookie(loginRes, cookieName)!;
    const pair = refreshCookie.split(';')[0];
    const refreshToken = pair.split('=')[1];
    const payload = decode(refreshToken);
    const sessionId = payload.sessionId as string;

    await strapi.db.query('admin::session').update({
      where: { sessionId },
      data: { absoluteExpiresAt: new Date(Date.now() - 1000) },
    });

    const res = await createRequest({ strapi }).post('/admin/access-token', {
      headers: { Cookie: pair },
    });
    expect(res.statusCode).toBe(401);
  });

  it('rotates refresh token and preserves remember-me cookie persistence', async () => {
    const rq = createRequest({ strapi });

    // Login with rememberMe=true -> persistent cookie expected
    const loginRes = await rq.post('/admin/login', {
      body: { ...superAdmin.loginInfo, rememberMe: true },
    });
    expect(loginRes.statusCode).toBe(200);

    const initialCookie = getCookie(loginRes, cookieName)!;
    expect(initialCookie).toMatch(/expires=/i);

    // Exchange for an access token (this should rotate refresh token)
    const pair = initialCookie.split(';')[0];
    const tokenRes = await createRequest({ strapi }).post('/admin/access-token', {
      headers: { Cookie: pair },
    });
    expect(tokenRes.statusCode).toBe(200);

    // Set-Cookie should carry a persistent expiry after rotation
    const rotatedCookie = getCookie(tokenRes, cookieName)!;
    expect(rotatedCookie).toBeDefined();
    expect(rotatedCookie).toMatch(/expires=/i);
    // Token string in cookie should change after rotation
    expect(rotatedCookie.split(';')[0]).not.toBe(pair);
  });

  it('rotates refresh token and keeps session cookie when rememberMe=false', async () => {
    const rq = createRequest({ strapi });

    // Login without rememberMe -> session cookie expected
    const loginRes = await rq.post('/admin/login', {
      body: { ...superAdmin.loginInfo, rememberMe: false },
    });
    expect(loginRes.statusCode).toBe(200);

    const cookie = getCookie(loginRes, cookieName)!;
    expect(cookie).toBeDefined();
    expect(cookie).not.toMatch(/expires=/i);

    // Exchange for an access token; rotated cookie should also be a session cookie
    const pair = cookie.split(';')[0];
    const tokenRes = await createRequest({ strapi }).post('/admin/access-token', {
      headers: { Cookie: pair },
    });
    expect(tokenRes.statusCode).toBe(200);

    const rotated = getCookie(tokenRes, cookieName)!;
    expect(rotated).toBeDefined();
    expect(rotated).not.toMatch(/expires=/i);
    // Token string in cookie should change after rotation
    expect(rotated.split(';')[0]).not.toBe(pair);
  });

  it('returns 401 when refresh cookie is invalid', async () => {
    const res = await createRequest({ strapi }).post('/admin/access-token', {
      headers: { Cookie: `${cookieName}=invalid.jwt` },
    });
    expect(res.statusCode).toBe(401);
  });
});
