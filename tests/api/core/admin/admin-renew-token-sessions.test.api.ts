'use strict';

import { createStrapiInstance, superAdmin } from 'api-tests/strapi';
import { createRequest } from 'api-tests/request';

/**
 * Tests for /admin/renew-token behavior with and without sessions
 */

describe('Admin Renew Token (sessions)', () => {
  let strapi: any;

  beforeAll(async () => {
    strapi = await createStrapiInstance();
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

    // Call renew-token which should behave as access-token
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
