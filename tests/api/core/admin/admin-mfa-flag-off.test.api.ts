'use strict';

import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest, createRequest } from 'api-tests/request';
import { createUtils } from 'api-tests/utils';

jest.setTimeout(120_000);

/**
 * The default product state: `unstableAdminMfa` off. Every other API and e2e suite runs with the
 * flag on, because the test app template defaults it on, so without this nothing proved that the
 * real route table, login path, user endpoints and permission registry behave as they did on
 * develop for an install that never opted in.
 *
 * The flag is read from the environment when the app config loads, so it is set before this
 * suite's instance boots -- bootstrap included -- and restored afterwards, since `test:api` runs
 * every suite in one process.
 */
describe('Admin MFA with the feature off', () => {
  let strapi: any;
  let rq: any;
  let utils: any;
  let role: any;
  let enrolled: any;
  const password = 'Password123';
  const previousFlag = process.env.UNSTABLE_ADMIN_MFA;

  beforeAll(async () => {
    process.env.UNSTABLE_ADMIN_MFA = 'false';

    strapi = await createStrapiInstance({
      async bootstrap({ strapi: s }: { strapi: any }) {
        s.config.set('admin.rateLimit.enabled', false);
      },
    });
    rq = await createAuthRequest({ strapi });
    utils = createUtils(strapi);

    role = await utils.createRole({ name: 'mfa_flag_off_editor', description: 'test' });
    enrolled = await utils.createUser({
      email: 'mfa-flag-off@strapi.io',
      firstname: 'Flag',
      lastname: 'Off',
      password,
      roles: [role.id],
    });

    // Enrolled while the feature was on, then the feature was switched off: the case that must
    // degrade to password-only rather than lock anyone out.
    await strapi.db.query('admin::user').update({
      where: { id: enrolled.id },
      data: { mfaEnabledAt: new Date(), mfaSecret: 'enc:not-read-while-off' },
    });
  });

  afterAll(async () => {
    await utils.deleteUsersById([enrolled.id]);
    await utils.deleteRolesById([role.id]);
    await strapi.destroy();

    if (previousFlag === undefined) {
      delete process.env.UNSTABLE_ADMIN_MFA;
    } else {
      process.env.UNSTABLE_ADMIN_MFA = previousFlag;
    }
  });

  test('the flag really is off for this instance', () => {
    expect(strapi.features.future.isEnabled('unstableAdminMfa')).toBe(false);
  });

  test('an enrolled account signs in with its password alone, and gets a session', async () => {
    const res = await createRequest({ strapi }).post('/admin/login', {
      body: { email: enrolled.email, password },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data).not.toHaveProperty('mfaRequired');
  });

  test.each([
    ['GET', '/admin/mfa/me'],
    ['POST', '/admin/mfa/enrol'],
    ['GET', '/admin/mfa/notices'],
    ['GET', '/admin/mfa/passkeys'],
    ['GET', '/admin/security-settings'],
    ['GET', '/admin/security-settings/mfa-impact?mode=required'],
  ])('%s %s answers 404, so a disabled install does not advertise it', async (method, url) => {
    const res = await rq({ method, url, body: {} });

    expect(res.statusCode).toBe(404);
  });

  test('POST /admin/login/mfa answers 404 before reading the body', async () => {
    const res = await createRequest({ strapi }).post('/admin/login/mfa', {
      body: { challengeToken: 'x'.repeat(64), code: '123456' },
    });

    expect(res.statusCode).toBe(404);
  });

  test('the user endpoints carry no enforcement state', async () => {
    const one = await rq({ method: 'GET', url: `/admin/users/${enrolled.id}` });
    const list = await rq({ method: 'GET', url: '/admin/users' });

    expect(one.statusCode).toBe(200);
    for (const field of ['mfaEnabledAt', 'mfaGraceUntil', 'mfaLockedAt', 'mfaSecret']) {
      expect(one.body.data).not.toHaveProperty(field);
    }
    const row = list.body.data.results.find((user: any) => user.id === enrolled.id);
    expect(row).toBeDefined();
    for (const field of ['mfaEnabledAt', 'mfaGraceUntil', 'mfaLockedAt', 'mfaSecret']) {
      expect(row).not.toHaveProperty(field);
    }
  });

  test('the role editor offers no security-settings permission', async () => {
    const res = await rq({ method: 'GET', url: '/admin/permissions' });

    expect(res.statusCode).toBe(200);
    expect(JSON.stringify(res.body.data)).not.toContain('security-settings');
  });
});
