'use strict';

import { createStrapiInstance, superAdmin } from 'api-tests/strapi';
import { createRequest } from 'api-tests/request';
import jwt from 'jsonwebtoken';

/**
 * Tests for /admin/access-token route behavior.
 */

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
        s.config.set('admin.auth.sessions.enabled', true);
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

    const cookiePair = refreshCookie!.split(';')[0]; // name=value

    const cookieRq = createRequest({ strapi });

    // Our test agent does not persist cookies across calls, so we forward the cookie header explicitly.
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

  it('returns 401 with invalid refresh token in body', async () => {
    const cleanRq = createRequest({ strapi });
    const res = await cleanRq.post('/admin/access-token', {
      body: { refreshToken: 'invalid.jwt' },
    });

    expect(res.statusCode).toBe(401);
  });

  it('returns 401 for missing token (no cookie and no body)', async () => {
    const rq = createRequest({ strapi });
    const res = await rq.post('/admin/access-token');

    expect(res.statusCode).toBe(401);
  });

  it('returns 200 with access token when refreshToken is supplied in body (no cookie)', async () => {
    // Login to obtain a valid refresh token in the response body
    const loginRes = await createRequest({ strapi }).post('/admin/login', {
      body: superAdmin.loginInfo,
    });
    expect(loginRes.statusCode).toBe(200);

    const refreshToken = loginRes.body?.data?.refreshToken as string;
    expect(refreshToken).toEqual(expect.any(String));

    const res = await createRequest({ strapi }).post('/admin/access-token', {
      body: { refreshToken },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body?.data?.token).toEqual(expect.any(String));

    const payload = decode(res.body.data.token);
    expect(payload).toMatchObject({
      type: 'access',
      userId: expect.any(String),
      sessionId: expect.any(String),
    });
  });

  it('uses body refreshToken over cookie when both are present', async () => {
    // Perform a login to get both a cookie and a body refresh token
    const loginRes = await createRequest({ strapi }).post('/admin/login', {
      body: superAdmin.loginInfo,
    });
    expect(loginRes.statusCode).toBe(200);

    const cookie = getCookie(loginRes, cookieName);
    expect(cookie).toBeDefined();

    // Valid refresh token from body
    const validRefreshToken = loginRes.body?.data?.refreshToken as string;
    expect(validRefreshToken).toEqual(expect.any(String));

    // Intentionally send an invalid cookie alongside a valid body token
    const headers = { Cookie: `${cookieName}=invalid.jwt` };
    const res = await createRequest({ strapi }).post('/admin/access-token', {
      headers,
      body: { refreshToken: validRefreshToken },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body?.data?.token).toEqual(expect.any(String));
  });

  it('returns 401 when refresh cookie is invalid', async () => {
    const res = await createRequest({ strapi }).post('/admin/access-token', {
      headers: { Cookie: `${cookieName}=invalid.jwt` },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('Admin Access Token Exchange (sessions disabled)', () => {
  let strapi: any;

  beforeAll(async () => {
    // Sessions disabled is the default; we ensure it explicitly
    strapi = await createStrapiInstance({
      bootstrap: async ({ strapi: s }: any) => {
        s.config.set('admin.auth.sessions.enabled', false);
      },
    });
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  it('returns 404 when sessions are disabled', async () => {
    const res = await createRequest({ strapi }).post('/admin/access-token');
    expect(res.statusCode).toBe(404);
  });
});
