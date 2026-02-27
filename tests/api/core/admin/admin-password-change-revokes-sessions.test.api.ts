'use strict';

import { createStrapiInstance } from 'api-tests/strapi';
import { createRequest } from 'api-tests/request';
import { createUtils } from 'api-tests/utils';

/**
 * Tests for admin password change session revocation
 * Focus: Verify that changing password via updateMe invalidates all refresh sessions
 */
describe('Admin Password Change Revokes Sessions', () => {
  let strapi: any;
  let rq: any;
  let utils: any;

  const cookieName = 'strapi_admin_refresh';

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = createRequest({ strapi });
    utils = createUtils(strapi);
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  const getCookie = (res: any, name: string): string | undefined => {
    const setCookies: string[] = res.headers['set-cookie'] || [];
    return setCookies.find((c) => c.startsWith(`${name}=`));
  };

  const extractRefreshToken = (cookie: string): string => {
    return cookie.split(';')[0].split('=')[1];
  };

  test('Password change via updateMe invalidates all existing refresh sessions', async () => {
    const initialPassword = 'Test1234!';
    const newPassword = 'NewTest1234!';

    // Create a test admin user
    const testAdmin = await utils.createUser({
      firstname: 'Test',
      lastname: 'Admin',
      email: 'test-pwd-change@strapi.io',
      password: initialPassword,
      isActive: true,
    });

    // Device 1: Login
    const loginDevice1Res = await rq.post('/admin/login', {
      body: {
        email: testAdmin.email,
        password: initialPassword,
        rememberMe: true,
      },
    });
    expect(loginDevice1Res.statusCode).toBe(200);
    const device1Cookie = getCookie(loginDevice1Res, cookieName);
    expect(device1Cookie).toBeDefined();
    const device1RefreshToken = extractRefreshToken(device1Cookie!);
    const device1AccessToken = loginDevice1Res.body.data.token;

    // Device 2: Login (simulate second device)
    const loginDevice2Res = await rq.post('/admin/login', {
      body: {
        email: testAdmin.email,
        password: initialPassword,
        rememberMe: true,
      },
    });
    expect(loginDevice2Res.statusCode).toBe(200);
    const device2Cookie = getCookie(loginDevice2Res, cookieName);
    expect(device2Cookie).toBeDefined();
    const device2RefreshToken = extractRefreshToken(device2Cookie!);

    // Verify both refresh tokens work before password change
    const refreshDevice1Before = await rq.post('/admin/access-token', {
      headers: {
        Cookie: `${cookieName}=${device1RefreshToken}`,
      },
    });
    expect(refreshDevice1Before.statusCode).toBe(200);
    expect(refreshDevice1Before.body.data.token).toEqual(expect.any(String));

    const refreshDevice2Before = await rq.post('/admin/access-token', {
      headers: {
        Cookie: `${cookieName}=${device2RefreshToken}`,
      },
    });
    expect(refreshDevice2Before.statusCode).toBe(200);
    expect(refreshDevice2Before.body.data.token).toEqual(expect.any(String));

    // Change password using device1's access token
    const updateMeRes = await rq.put('/admin/users/me', {
      headers: {
        Authorization: `Bearer ${device1AccessToken}`,
      },
      body: {
        currentPassword: initialPassword,
        password: newPassword,
      },
    });
    expect(updateMeRes.statusCode).toBe(200);

    // Verify OLD refresh tokens from BOTH devices are now invalid
    const refreshDevice1After = await rq.post('/admin/access-token', {
      headers: {
        Cookie: `${cookieName}=${device1RefreshToken}`,
      },
    });
    expect(refreshDevice1After.statusCode).toBe(401);

    const refreshDevice2After = await rq.post('/admin/access-token', {
      headers: {
        Cookie: `${cookieName}=${device2RefreshToken}`,
      },
    });
    expect(refreshDevice2After.statusCode).toBe(401);

    // Verify can login with new password
    const reloginRes = await rq.post('/admin/login', {
      body: {
        email: testAdmin.email,
        password: newPassword,
        rememberMe: true,
      },
    });
    expect(reloginRes.statusCode).toBe(200);
    expect(reloginRes.body.data.token).toEqual(expect.any(String));

    // Verify the new login's refresh token works
    const newCookie = getCookie(reloginRes, cookieName);
    expect(newCookie).toBeDefined();
    const newRefreshToken = extractRefreshToken(newCookie!);

    const refreshNewToken = await rq.post('/admin/access-token', {
      headers: {
        Cookie: `${cookieName}=${newRefreshToken}`,
      },
    });
    expect(refreshNewToken.statusCode).toBe(200);
    expect(refreshNewToken.body.data.token).toEqual(expect.any(String));
  });

  test('Cannot login with old password after password change', async () => {
    const initialPassword = 'OldPass1234!';
    const newPassword = 'NewPass1234!';

    // Create a test admin user
    const testAdmin = await utils.createUser({
      firstname: 'Test2',
      lastname: 'Admin',
      email: 'test-pwd-change-2@strapi.io',
      password: initialPassword,
      isActive: true,
    });

    // Login
    const loginRes = await rq.post('/admin/login', {
      body: {
        email: testAdmin.email,
        password: initialPassword,
      },
    });
    expect(loginRes.statusCode).toBe(200);
    const accessToken = loginRes.body.data.token;

    // Change password
    const updateMeRes = await rq.put('/admin/users/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: {
        currentPassword: initialPassword,
        password: newPassword,
      },
    });
    expect(updateMeRes.statusCode).toBe(200);

    // Verify cannot login with old password
    const oldPasswordRes = await rq.post('/admin/login', {
      body: {
        email: testAdmin.email,
        password: initialPassword,
      },
    });
    expect(oldPasswordRes.statusCode).toBe(400);

    // Verify can login with new password
    const newPasswordRes = await rq.post('/admin/login', {
      body: {
        email: testAdmin.email,
        password: newPassword,
      },
    });
    expect(newPasswordRes.statusCode).toBe(200);
  });

  test('Profile update without password change does not invalidate sessions', async () => {
    const initialPassword = 'InitialPass1234!';

    // Create a test admin user
    const testAdmin = await utils.createUser({
      firstname: 'Test3',
      lastname: 'Admin',
      email: 'test-pwd-change-3@strapi.io',
      password: initialPassword,
      isActive: true,
    });

    // Login
    const loginRes = await rq.post('/admin/login', {
      body: {
        email: testAdmin.email,
        password: initialPassword,
        rememberMe: true,
      },
    });

    expect(loginRes.statusCode).toBe(200);
    const cookie = getCookie(loginRes, cookieName);
    expect(cookie).toBeDefined();
    const refreshToken = extractRefreshToken(cookie!);
    const accessToken = loginRes.body.data.token;

    // Update profile without password change (e.g., just firstname)
    const updateMeRes = await rq.put('/admin/users/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: {
        firstname: 'UpdatedFirstname',
      },
    });
    expect(updateMeRes.statusCode).toBe(200);

    // Verify refresh token still works (no invalidation occurred)
    const refreshAfter = await rq.post('/admin/access-token', {
      headers: {
        Cookie: `${cookieName}=${refreshToken}`,
      },
    });
    expect(refreshAfter.statusCode).toBe(200);
    expect(refreshAfter.body.data.token).toEqual(expect.any(String));
  });
});
