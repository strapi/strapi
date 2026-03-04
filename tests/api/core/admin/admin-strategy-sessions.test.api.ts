'use strict';

import { createStrapiInstance } from 'api-tests/strapi';
import { createRequest } from 'api-tests/request';
import jwt from 'jsonwebtoken';

describe('admin strategy', () => {
  let strapi: any;

  const cookieName = 'strapi_admin_refresh';

  beforeAll(async () => {
    strapi = await createStrapiInstance();
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  it('accepts a valid access token', async () => {
    const rq = createRequest({ strapi });

    // Login to create refresh cookie, then exchange to get access token
    const loginRes = await rq.post('/admin/login', {
      body: { email: 'admin@strapi.io', password: 'Password123' },
    });
    expect(loginRes.statusCode).toBe(200);

    const setCookies: string[] = loginRes.headers['set-cookie'] || [];
    const refreshCookie = setCookies.find((c) => c.startsWith(`${cookieName}=`));
    expect(refreshCookie).toBeDefined();

    // Forward cookie explicitly from the login response
    const cookiePair = refreshCookie!.split(';')[0];
    const tokenRes = await createRequest({ strapi }).post('/admin/access-token', {
      headers: { Cookie: cookiePair },
    });
    expect(tokenRes.statusCode).toBe(200);

    // Hitting an authenticated admin route should work with access token
    const accessToken = tokenRes.body?.data?.token as string;
    const okWithAccess = await createRequest({ strapi })
      .setToken(accessToken)
      .get('/admin/users/me');
    expect(okWithAccess.statusCode).toBe(200);
  });

  it('rejects access token if session was revoked', async () => {
    const rq = createRequest({ strapi });
    const loginRes = await rq.post('/admin/login', {
      body: { email: 'admin@strapi.io', password: 'Password123' },
    });
    expect(loginRes.statusCode).toBe(200);

    const setCookies: string[] = loginRes.headers['set-cookie'] || [];
    const refreshCookie = setCookies.find((c) => c.startsWith(`${cookieName}=`));
    const cookiePair = refreshCookie!.split(';')[0];

    const tokenRes = await createRequest({ strapi }).post('/admin/access-token', {
      headers: { Cookie: cookiePair },
    });
    const accessToken = tokenRes.body?.data?.token as string;

    // Revoke all sessions for admin via logout
    // const legacy = loginRes.body?.data?.token as string;
    const logoutRes = await createRequest({ strapi }).setToken(accessToken).post('/admin/logout');
    expect(logoutRes.statusCode).toBe(200);

    // Now the access token should be rejected by strategy
    const res = await createRequest({ strapi }).setToken(accessToken).get('/admin/users/me');
    expect(res.statusCode).toBe(401);
  });

  it('rejects Bearer refresh token (wrong token type)', async () => {
    const rq = createRequest({ strapi });
    const loginRes = await rq.post('/admin/login', {
      body: { email: 'admin@strapi.io', password: 'Password123' },
    });
    expect(loginRes.statusCode).toBe(200);

    // Extract refresh token from cookie instead of response body
    const setCookies: string[] = loginRes.headers['set-cookie'] || [];
    const refreshCookie = setCookies.find((c) => c.startsWith(`strapi_admin_refresh=`));
    expect(refreshCookie).toBeDefined();
    const refreshToken = refreshCookie!.split(';')[0].split('=')[1];

    const res = await createRequest({ strapi }).setToken(refreshToken).get('/admin/users/me');
    expect(res.statusCode).toBe(401);
  });

  it('rejects access token when the session record expires in DB', async () => {
    const rq = createRequest({ strapi });
    const loginRes = await rq.post('/admin/login', {
      body: { email: 'admin@strapi.io', password: 'Password123' },
    });
    expect(loginRes.statusCode).toBe(200);

    const setCookies: string[] = loginRes.headers['set-cookie'] || [];
    const refreshCookie = setCookies.find((c) => c.startsWith(`${cookieName}=`));
    const cookiePair = refreshCookie!.split(';')[0];

    // Obtain an access token
    const tokenRes = await createRequest({ strapi }).post('/admin/access-token', {
      headers: { Cookie: cookiePair },
    });
    expect(tokenRes.statusCode).toBe(200);
    const accessToken = tokenRes.body?.data?.token as string;

    // Decode access token to get sessionId and expire the session in DB
    const decoded: any = jwt.verify(accessToken, strapi.config.get('admin.auth.secret'));
    const sessionId = decoded.sessionId as string;

    // Expire the session
    await strapi.db.query('admin::session').update({
      where: { sessionId },
      data: { expiresAt: new Date(Date.now() - 60 * 1000) },
    });

    // Now access should be rejected
    const res = await createRequest({ strapi }).setToken(accessToken).get('/admin/users/me');
    expect(res.statusCode).toBe(401);
  });
});

describe('admin strategy with short access token lifespan (expiry)', () => {
  let strapi: any;
  const cookieName = 'strapi_admin_refresh';

  beforeAll(async () => {
    strapi = await createStrapiInstance({
      bootstrap: async ({ strapi: s }: any) => {
        s.config.set('admin.auth.sessions.accessTokenLifespan', 1); // 1 second
      },
    });
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  it.todo(
    'rejects expired access token after short TTL'
    // async () => {
    // const rq = createRequest({ strapi });
    // const loginRes = await rq.post('/admin/login', {
    //   body: { email: 'admin@strapi.io', password: 'Password123' },
    // });
    // expect(loginRes.statusCode).toBe(200);
    // const setCookies: string[] = loginRes.headers['set-cookie'] || [];
    // const refreshCookie = setCookies.find((c) => c.startsWith(`${cookieName}=`));
    // const cookiePair = refreshCookie!.split(';')[0];
    // const tokenRes = await createRequest({ strapi }).post('/admin/access-token', {
    //   headers: { Cookie: cookiePair },
    // });
    // expect(tokenRes.statusCode).toBe(200);
    // const accessToken = tokenRes.body?.data?.token as string;
    // // Wait for TTL to elapse
    // await new Promise((r) => setTimeout(r, 1200));
    // const res = await createRequest({ strapi })
    //
    //   .setToken(accessToken)
    //   .get('/admin/users/me');
    // expect(res.statusCode).toBe(401);
    // });
  );
});
