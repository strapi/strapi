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
