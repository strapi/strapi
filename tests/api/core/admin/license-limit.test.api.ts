import type { Core } from '@strapi/types';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest, createRequest } from 'api-tests/request';
import { createUtils, describeOnCondition } from 'api-tests/utils';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

describe('License limit information', () => {
  let strapi: Core.Strapi;
  let rq;

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  test('Returns 401 without a token', async () => {
    const res = await createRequest({ strapi })({
      method: 'GET',
      url: '/admin/license-limit-information',
    });

    expect(res.statusCode).toBe(401);
  });

  test('Returns the license limits with a token', async () => {
    const res = await rq({ method: 'GET', url: '/admin/license-limit-information' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      currentActiveUserCount: expect.any(Number),
      enforcementUserCount: expect.any(Number),
      shouldNotify: expect.any(Boolean),
      shouldStopCreate: expect.any(Boolean),
      isHostedOnStrapiCloud: expect.any(Boolean),
      isTrial: expect.any(Boolean),
      features: expect.any(Array),
    });
  });

  describeOnCondition(edition === 'CE')('CE', () => {
    test('Reports no seat limit and no license', async () => {
      const activeUserCount = await strapi.db.query('admin::user').count({
        where: { isActive: true },
      });

      const res = await rq({ method: 'GET', url: '/admin/license-limit-information' });

      expect(res.body.data).toStrictEqual({
        currentActiveUserCount: activeUserCount,
        enforcementUserCount: activeUserCount,
        shouldNotify: false,
        shouldStopCreate: false,
        licenseLimitStatus: null,
        isHostedOnStrapiCloud: false,
        isTrial: false,
        features: [],
      });
    });

    test('Leaves a stale disabled users list alone when a user is deleted', async () => {
      const utils = createUtils(strapi);
      const superAdminRole = await utils.getSuperAdminRole();
      const user = await utils.createUser({
        email: 'license-limit@test.com',
        firstname: 'Seat',
        lastname: 'Less',
        password: 'Password123',
        roles: [superAdminRole.id],
      });
      const staleList = [{ id: user.id, isActive: true }];
      await strapi.store.set({ type: 'ee', key: 'disabled_users', value: staleList });

      try {
        const res = await rq({ method: 'DELETE', url: `/admin/users/${user.id}` });

        expect(res.statusCode).toBe(200);
        expect(await strapi.store.get({ type: 'ee', key: 'disabled_users' })).toStrictEqual(
          staleList
        );
      } finally {
        await strapi.store.delete({ type: 'ee', key: 'disabled_users' });
      }
    });
  });
});
