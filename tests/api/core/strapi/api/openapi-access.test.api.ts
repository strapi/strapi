import type { Core } from '@strapi/types';

import { createStrapiInstance } from 'api-tests/strapi';
import { createRequest, createAuthRequest } from 'api-tests/request';

/**
 * API tests for the access control of the OpenAPI HTTP endpoints.
 *
 * The endpoints rely on Strapi's existing auth (no bespoke OpenAPI permission):
 *  - content-api (`/api/openapi.json`): controlled by `server.openapi['content-api'].access`.
 *    Only `public` is supported for now, which disables auth entirely.
 *  - admin (`/admin/openapi.json`): requires an authenticated admin via
 *    `admin::isAuthenticatedAdmin`. No public option; granular RBAC comes later.
 */

const CONTENT_API_PATH = '/api/openapi.json';
const ADMIN_PATH = '/admin/openapi.json';

const createOpenAPIStrapiInstance = (openapiConfig: Core.Config.OpenAPI) =>
  createStrapiInstance({
    bypassAuth: false,
    register: ({ strapi }: { strapi: Core.Strapi }) => {
      strapi.config.set('server.openapi', openapiConfig);
    },
  } as Parameters<typeof createStrapiInstance>[0] & {
    register: (args: { strapi: Core.Strapi }) => void;
  });

const expectOpenAPIDocument = (body: any) => {
  expect(body).toBeDefined();
  expect(typeof body.openapi).toBe('string');
  expect(body.paths).toBeDefined();
};

describe('OpenAPI endpoints – access control', () => {
  describe('content-api (public mode)', () => {
    let strapi: Core.Strapi;

    beforeAll(async () => {
      strapi = await createOpenAPIStrapiInstance({
        'content-api': { access: 'public' },
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
      strapi = await createOpenAPIStrapiInstance({
        admin: { access: 'authenticated' },
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
