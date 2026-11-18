'use strict';

import { createStrapiInstance, superAdmin } from 'api-tests/strapi';
import { createRequest } from 'api-tests/request';

/**
 * The admin panel moves with `admin.url`, the admin API does not: it stays under
 * `/admin`, behind any `server.url` subpath. A browser only attaches a cookie to
 * requests whose path its `Path` attribute matches, so these tests replay the
 * login and refresh round trip the way a browser would and check that the
 * refresh cookie still reaches `POST /admin/access-token`.
 */
describe('Admin auth cookie path', () => {
  const REFRESH_COOKIE = 'strapi_admin_refresh';

  // RFC 6265 section 5.1.4 path-match.
  const pathMatches = (cookiePath: string, requestPath: string) =>
    requestPath === cookiePath ||
    (requestPath.startsWith(cookiePath) &&
      (cookiePath.endsWith('/') || requestPath.charAt(cookiePath.length) === '/'));

  const parseSetCookies = (res: any) =>
    ((res.headers['set-cookie'] || []) as string[]).map((header) => {
      const [pair, ...attributes] = header.split(';').map((part) => part.trim());
      const pathAttribute = attributes.find((attr) => attr.toLowerCase().startsWith('path='));
      return {
        name: pair.split('=')[0],
        pair,
        path: pathAttribute?.slice('path='.length),
      };
    });

  // The Cookie header a browser builds for `browserPath` from the cookies set by `res`.
  const cookieHeaderFor = (res: any, browserPath: string) =>
    parseSetCookies(res)
      .filter(({ path }) => path !== undefined && pathMatches(path, browserPath))
      .map(({ pair }) => pair)
      .join('; ');

  const scenarios = [
    {
      name: 'default admin.url',
      config: {},
      // Path the browser requests for the refresh endpoint.
      browserRefreshPath: '/admin/access-token',
      expectedRefreshCookiePath: '/admin',
    },
    {
      name: "admin.url: '/dashboard'",
      // URL config as packages/core/core/src/configuration resolves admin.url: '/dashboard'
      config: (serverAbsoluteUrl: string) => ({
        'admin.url': '/dashboard',
        'admin.path': '/dashboard',
        'admin.absoluteUrl': `${serverAbsoluteUrl}/dashboard`,
      }),
      browserRefreshPath: '/admin/access-token',
      expectedRefreshCookiePath: '/admin',
    },
    {
      name: "admin.url: '/dashboard' with the old admin.auth.cookie.path: '/dashboard' workaround",
      config: (serverAbsoluteUrl: string) => ({
        'admin.url': '/dashboard',
        'admin.path': '/dashboard',
        'admin.absoluteUrl': `${serverAbsoluteUrl}/dashboard`,
        'admin.auth.cookie.path': '/dashboard',
      }),
      browserRefreshPath: '/admin/access-token',
      expectedRefreshCookiePath: '/admin',
    },
    {
      name: "server.url: 'https://example.com/strapi' behind a proxy that strips /strapi",
      config: () => ({
        'server.url': 'https://example.com/strapi',
        'server.absoluteUrl': 'https://example.com/strapi',
        'admin.url': 'https://example.com/strapi/admin',
        'admin.path': '/admin',
        'admin.absoluteUrl': 'https://example.com/strapi/admin',
      }),
      browserRefreshPath: '/strapi/admin/access-token',
      expectedRefreshCookiePath: '/strapi/admin',
    },
  ];

  describe.each(scenarios)('$name', ({ config, browserRefreshPath, expectedRefreshCookiePath }) => {
    let strapi: any;

    beforeAll(async () => {
      strapi = await createStrapiInstance({
        // Error level: the workaround scenario logs the expected path override warning.
        logLevel: 'error',
        register: async ({ strapi: s }: any) => {
          // Instances in one Jest file share @strapi/admin's config object (core's admin
          // loader merges into it), so clear what an earlier scenario may have set.
          s.config.set('admin.auth.cookie.path', '');
          const values =
            typeof config === 'function' ? config(s.config.get('server.absoluteUrl')) : config;
          Object.entries(values).forEach(([key, value]) => s.config.set(key, value));
          s.config.set('admin.rateLimit.enabled', false);
        },
      });
    });

    afterAll(async () => {
      await strapi.destroy();
    });

    it('logs in and refreshes the access token with the cookies a browser would send', async () => {
      const loginRes = await createRequest({ strapi }).post('/admin/login', {
        body: superAdmin.loginInfo,
      });
      expect(loginRes.statusCode).toBe(200);

      // The proxy (if any) strips the server.url prefix, so Strapi always sees /admin/access-token.
      const refreshRes = await createRequest({ strapi }).post('/admin/access-token', {
        headers: { Cookie: cookieHeaderFor(loginRes, browserRefreshPath) },
      });

      expect(refreshRes.statusCode).toBe(200);
      expect(refreshRes.body?.data?.token).toEqual(expect.any(String));

      const refreshCookie = parseSetCookies(loginRes).find(({ name }) => name === REFRESH_COOKIE);
      const rotatedCookie = parseSetCookies(refreshRes).find(({ name }) => name === REFRESH_COOKIE);
      expect(refreshCookie?.path).toBe(expectedRefreshCookiePath);
      expect(rotatedCookie?.path).toBe(expectedRefreshCookiePath);
    });
  });
});
