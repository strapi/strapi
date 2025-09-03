'use strict';

import { createStrapiInstance, superAdmin } from 'api-tests/strapi';
import { createRequest } from 'api-tests/request';

/**
 * Tests for /admin/renew-token behavior with and without sessions
 */

describe('Admin Renew Token (sessions enabled)', () => {
  let strapi: any;

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

  it('behaves like access-token and sets deprecation headers', async () => {
    const loginRes = await createRequest({ strapi }).post('/admin/login', {
      body: superAdmin.loginInfo,
    });
    expect(loginRes.statusCode).toBe(200);

    // Ensure refresh cookie exists
    const setCookies: string[] = loginRes.headers['set-cookie'] || [];
    const refreshCookie = setCookies.find((c) => c.startsWith('strapi_admin_refresh='));
    expect(refreshCookie).toBeDefined();
    const cookiePair = refreshCookie!.split(';')[0];

    // Call renew-token which should behave as access-token when sessions are enabled
    const res = await createRequest({ strapi }).post('/admin/renew-token', {
      headers: { Cookie: cookiePair },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body?.data?.token).toEqual(expect.any(String));

    // Deprecation headers
    expect(res.headers['deprecation']).toBeDefined();
    expect(String(res.headers['deprecation'])).toMatch(/true/i);
    expect(res.headers['link']).toMatch(/<\/admin\/access-token>;/);
    // Warning header format: 299 - "Deprecated admin endpoint: use /admin/access-token"
    expect(res.headers['warning']).toMatch(/Deprecated admin endpoint/i);
  });
});

describe('Admin Renew Token (sessions disabled - legacy)', () => {
  let strapi: any;

  beforeAll(async () => {
    strapi = await createStrapiInstance({
      bootstrap: async ({ strapi: s }: any) => {
        s.config.set('admin.auth.sessions.enabled', false);
      },
    });
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  it('returns a new legacy token for valid legacy token', async () => {
    // Log in to get a legacy token (primary when sessions disabled)
    const loginRes = await createRequest({ strapi }).post('/admin/login', {
      body: superAdmin.loginInfo,
    });
    expect(loginRes.statusCode).toBe(200);

    const legacyToken = loginRes.body?.data?.token as string;
    expect(legacyToken).toEqual(expect.any(String));

    const res = await createRequest({ strapi }).post('/admin/renew-token', {
      body: { token: legacyToken },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body?.data?.token).toEqual(expect.any(String));
    // New token should differ from the old one in typical flows, but we avoid asserting inequality
  });

  it('returns 400 ValidationError for invalid legacy token', async () => {
    const res = await createRequest({ strapi }).post('/admin/renew-token', {
      body: { token: 'not-a-valid-legacy-jwt' },
    });

    expect(res.statusCode).toBe(400);
  });
});
