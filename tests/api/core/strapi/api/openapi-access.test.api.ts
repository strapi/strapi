import type { Core } from '@strapi/types';

import { createStrapiInstance } from 'api-tests/strapi';
import { createRequest, createContentAPIRequest, createAuthRequest } from 'api-tests/request';

/**
 * API tests for the access control of the (unstable) OpenAPI HTTP endpoints.
 *
 * The endpoints are gated behind the `future.unstableOpenapi` flag and rely on
 * Strapi's existing auth (no bespoke OpenAPI permission):
 *  - content-api (`/api/openapi.json`): controlled by `server.openapi['content-api'].access`.
 *    `authenticated` requires standard Content API auth (authenticated user or
 *    full-access API token); `public` disables auth entirely.
 *  - admin (`/admin/openapi.json`): requires an authenticated admin via
 *    `admin::isAuthenticatedAdmin`. No public option; granular RBAC comes later.
 */

const CONTENT_API_PATH = '/api/openapi.json';
const ADMIN_PATH = '/admin/openapi.json';

const enableUnstableOpenapi = (instance: Core.Strapi) => {
  instance.config.set('features', { future: { unstableOpenapi: true } });
};

const expectOpenAPIDocument = (body: any) => {
  expect(body).toBeDefined();
  expect(typeof body.openapi).toBe('string');
  expect(body.paths).toBeDefined();
};

describe('OpenAPI endpoints – access control', () => {
  describe('content-api (authenticated mode, default)', () => {
    let strapi: Core.Strapi;
    let fullAccessToken: string;
    let readOnlyToken: string;

    beforeAll(async () => {
      strapi = await createStrapiInstance({
        bypassAuth: false,
        register: ({ strapi: instance }) => {
          enableUnstableOpenapi(instance);
          instance.config.set('server.openapi', {
            'content-api': { access: 'authenticated' },
          });
        },
      });

      // Required so content-api tokens can be created (their access key is encrypted at rest).
      strapi.config.set('admin.secrets.encryptionKey', 'test-encryption-key-for-openapi-tests');

      const createContentApiToken = async (attributes: Record<string, unknown>) => {
        const token = await strapi
          .service('admin::api-token-content-api')
          .create({ description: '', ...attributes });

        return token.accessKey as string;
      };

      fullAccessToken = await createContentApiToken({
        name: 'openapi-full-access',
        type: 'full-access',
      });
      readOnlyToken = await createContentApiToken({
        name: 'openapi-read-only',
        type: 'read-only',
      });
    });

    afterAll(async () => {
      await strapi.db.query('admin::api-token').deleteMany({
        where: { name: { $startsWith: 'openapi-' } },
      });
      await strapi.destroy();
    });

    test('Denies an anonymous request (not 200)', async () => {
      const rq = createRequest({ strapi });

      const res = await rq({ method: 'GET', url: CONTENT_API_PATH });

      expect(res.statusCode).not.toBe(200);
      expect([401, 403]).toContain(res.statusCode);
    });

    test('Allows a full-access token (200)', async () => {
      const rq = createContentAPIRequest({ strapi, auth: { token: fullAccessToken } });

      const res = await rq({ method: 'GET', url: '/openapi.json' });

      expect(res.statusCode).toBe(200);
      expectOpenAPIDocument(res.body);
    });

    test('Denies a read-only token (no matching scope)', async () => {
      const rq = createContentAPIRequest({ strapi, auth: { token: readOnlyToken } });

      const res = await rq({ method: 'GET', url: '/openapi.json' });

      expect(res.statusCode).not.toBe(200);
      expect([401, 403]).toContain(res.statusCode);
    });
  });

  describe('content-api (public mode)', () => {
    let strapi: Core.Strapi;

    beforeAll(async () => {
      strapi = await createStrapiInstance({
        bypassAuth: false,
        register: ({ strapi: instance }) => {
          enableUnstableOpenapi(instance);
          instance.config.set('server.openapi', {
            'content-api': { access: 'public' },
          });
        },
      });
    });

    afterAll(async () => {
      await strapi.destroy();
    });

    test('Allows an anonymous request (200)', async () => {
      const rq = createRequest({ strapi });

      const res = await rq({ method: 'GET', url: CONTENT_API_PATH });

      expect(res.statusCode).toBe(200);
      expectOpenAPIDocument(res.body);
    });
  });

  describe('admin (authenticated)', () => {
    let strapi: Core.Strapi;
    let restrictedRoleId: number | string;

    const restrictedUser = {
      email: 'openapi-restricted@strapi.io',
      password: 'Test1234',
      firstname: 'OpenAPI',
      lastname: 'Restricted',
    };

    beforeAll(async () => {
      strapi = await createStrapiInstance({
        bypassAuth: false,
        register: ({ strapi: instance }) => {
          enableUnstableOpenapi(instance);
          instance.config.set('server.openapi', {
            admin: { access: 'authenticated' },
          });
        },
      });

      const role = await strapi.service('admin::role').create({
        name: 'openapi-restricted-role',
        description: 'Role used for OpenAPI admin endpoint access tests',
      });

      restrictedRoleId = role.id;

      await strapi.service('admin::user').create({
        ...restrictedUser,
        registrationToken: null,
        isActive: true,
        roles: [role.id],
      });
    });

    afterAll(async () => {
      await strapi.db.query('admin::user').deleteMany({ where: { email: restrictedUser.email } });
      await strapi.service('admin::role').deleteByIds([restrictedRoleId]);
      await strapi.destroy();
    });

    test('Denies an unauthenticated request (401)', async () => {
      const rq = createRequest({ strapi });

      const res = await rq({ method: 'GET', url: ADMIN_PATH });

      expect(res.statusCode).toBe(401);
    });

    test('Allows the super admin (200)', async () => {
      const rq = await createAuthRequest({ strapi });

      const res = await rq({ method: 'GET', url: ADMIN_PATH });

      expect(res.statusCode).toBe(200);
      expectOpenAPIDocument(res.body);
    });

    test('Allows any authenticated admin, regardless of role/permissions (200)', async () => {
      // Access is currently gated only by `admin::isAuthenticatedAdmin`; granular
      // per-permission RBAC will be added in a later iteration.
      const rq = await createAuthRequest({ strapi, userInfo: restrictedUser });

      const res = await rq({ method: 'GET', url: ADMIN_PATH });

      expect(res.statusCode).toBe(200);
      expectOpenAPIDocument(res.body);
    });
  });
});
