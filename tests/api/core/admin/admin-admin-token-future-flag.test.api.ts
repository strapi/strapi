import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createAgent } from 'api-tests/agent';
import type { Core } from '@strapi/types';

describe('Admin Admin Token future flag (api)', () => {
  let strapi: Core.Strapi;
  let rq: Awaited<ReturnType<typeof createAuthRequest>>;

  const deleteAllAdminTokens = async () => {
    await strapi.db.query('admin::api-token').deleteMany({ where: { kind: 'admin' } });
  };

  const createBearerAdminToken = async () => {
    const superAdminUser = await strapi.db.query('admin::user').findOne({
      where: { email: 'admin@strapi.io' },
      populate: ['roles'],
    });

    expect(superAdminUser).toBeDefined();

    const apiTokenService = strapi.service('admin::api-token-admin') as {
      create(
        attributes: { name: string; adminPermissions: [] },
        callingUser: Record<string, unknown>
      ): Promise<{ accessKey: string }>;
    };

    const apiToken = await apiTokenService.create(
      {
        name: 'admin-token-feature-flag-disabled',
        adminPermissions: [],
      },
      superAdminUser as Record<string, unknown>
    );

    return apiToken.accessKey;
  };

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    strapi.config.set('admin.secrets.encryptionKey', 'test-encryption-key');
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await deleteAllAdminTokens();
    await strapi.destroy();
  });

  afterEach(async () => {
    await deleteAllAdminTokens();
  });

  test('returns 404 on admin-token routes when the future flag is disabled', async () => {
    const res = await rq({
      url: '/admin/admin-tokens',
      method: 'GET',
    });

    expect(res.statusCode).toBe(404);
  });

  test('rejects bearer admin-token authentication when the future flag is disabled', async () => {
    const accessKey = await createBearerAdminToken();
    const bearerRq = createAgent(strapi, { token: accessKey });

    const res = await bearerRq({
      url: '/admin/users/me',
      method: 'GET',
    });

    expect(res.statusCode).toBe(401);
  });
});
