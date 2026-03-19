'use strict';

import { createStrapiInstance } from 'api-tests/strapi';
import { createRequest } from 'api-tests/request';
import { createAuthenticatedUser } from '../utils';

let strapi: any;

const baseTestUser = {
  password: 'Test1234!',
  confirmed: true,
  provider: 'local',
};

describe('Users & Permissions - Password updates revoke all refresh sessions', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance({
      bypassAuth: false,
      async bootstrap({ strapi: s }) {
        s.config.set('plugin::users-permissions.jwtManagement', 'refresh');
        s.config.set('plugin::users-permissions.sessions.httpOnly', false);
      },
    });
  });

  afterAll(async () => {
    await strapi.db.query('plugin::users-permissions.user').deleteMany();
    await strapi.destroy();
  });

  // Helper to create a user with unique credentials
  const createUser = async (prefix: string) => {
    const userInfo = {
      ...baseTestUser,
      username: `${prefix}-${Date.now()}`,
      email: `${prefix}-${Date.now()}@strapi.io`,
    };
    await createAuthenticatedUser({ strapi, userInfo });
    return userInfo;
  };

  // Helper to login and get tokens
  const loginUser = async (rqAuth: any, email: string, password: string) => {
    const res = await rqAuth({
      method: 'POST',
      url: '/local',
      body: { identifier: email, password },
    });
    expect(res.statusCode).toBe(200);
    return {
      jwt: res.body.jwt,
      refreshToken: res.body.refreshToken,
    };
  };

  // Helper to verify refresh token works
  const verifyRefreshToken = async (rqAuth: any, refreshToken: string, shouldWork: boolean) => {
    const res = await rqAuth({
      method: 'POST',
      url: '/refresh',
      body: { refreshToken },
    });
    if (shouldWork) {
      expect(res.statusCode).toBe(200);
    } else {
      expect(res.statusCode).toBe(401);
      expect(res.body.error.message).toBe('Invalid refresh token');
    }
    return res;
  };

  describe.each([
    {
      name: 'password change',
      performPasswordUpdate: async (
        _rqAuth: any,
        user: { email: string; password: string },
        jwt: string,
        newPassword: string
      ) => {
        const rqAuthed = createRequest({ strapi }).setURLPrefix('/api/auth').setToken(jwt);
        const res = await rqAuthed({
          method: 'POST',
          url: '/change-password',
          body: {
            currentPassword: user.password,
            password: newPassword,
            passwordConfirmation: newPassword,
          },
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.jwt).toEqual(expect.any(String));
        expect(res.body.refreshToken).toEqual(expect.any(String));
        return res.body.refreshToken;
      },
    },
    {
      name: 'password reset',
      performPasswordUpdate: async (
        rqAuth: any,
        user: { email: string; password: string },
        _jwt: string,
        newPassword: string
      ) => {
        // Generate reset password token
        const resetPasswordToken = `reset-token-${Date.now()}`;
        const dbUser = await strapi.db
          .query('plugin::users-permissions.user')
          .findOne({ where: { email: user.email } });

        await strapi.db.query('plugin::users-permissions.user').update({
          where: { id: dbUser.id },
          data: { resetPasswordToken },
        });

        // Reset password using the token
        const res = await rqAuth({
          method: 'POST',
          url: '/reset-password',
          body: {
            code: resetPasswordToken,
            password: newPassword,
            passwordConfirmation: newPassword,
          },
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.jwt).toEqual(expect.any(String));
        expect(res.body.refreshToken).toEqual(expect.any(String));
        return res.body.refreshToken;
      },
    },
  ])('$name', ({ name, performPasswordUpdate }) => {
    test(`${name} invalidates all existing refresh tokens (multi-session scenario)`, async () => {
      const rqAuth = createRequest({ strapi }).setURLPrefix('/api/auth');
      const user = await createUser(`test-${name.replace(' ', '-')}-revoke`);

      // Create two sessions (simulating two devices)
      const session1 = await loginUser(rqAuth, user.email, user.password);
      const session2 = await loginUser(rqAuth, user.email, user.password);

      // Verify tokens are different
      expect(session1.refreshToken).not.toBe(session2.refreshToken);

      // Verify both refresh tokens work before password update
      await verifyRefreshToken(rqAuth, session1.refreshToken, true);
      await verifyRefreshToken(rqAuth, session2.refreshToken, true);

      // Perform password update
      const newPassword = 'NewPassword1234!';
      const newRefreshToken = await performPasswordUpdate(rqAuth, user, session1.jwt, newPassword);

      // Verify the NEW refresh token from password update works
      await verifyRefreshToken(rqAuth, newRefreshToken, true);

      // Verify OLD refresh tokens from BOTH sessions are now invalid
      await verifyRefreshToken(rqAuth, session1.refreshToken, false);
      await verifyRefreshToken(rqAuth, session2.refreshToken, false);
    });

    test(`can login with new password after ${name}`, async () => {
      const rqAuth = createRequest({ strapi }).setURLPrefix('/api/auth');
      const user = await createUser(`test-${name.replace(' ', '-')}-login`);

      // Login to get JWT (needed for password change)
      const session = await loginUser(rqAuth, user.email, user.password);

      // Perform password update
      const newPassword = 'UpdatedPass1234!';
      await performPasswordUpdate(rqAuth, user, session.jwt, newPassword);

      // Verify can login with new password
      const reloginRes = await rqAuth({
        method: 'POST',
        url: '/local',
        body: { identifier: user.email, password: newPassword },
      });
      expect(reloginRes.statusCode).toBe(200);
      expect(reloginRes.body.jwt).toEqual(expect.any(String));
      expect(reloginRes.body.refreshToken).toEqual(expect.any(String));

      // Verify cannot login with old password
      const oldPasswordRes = await rqAuth({
        method: 'POST',
        url: '/local',
        body: { identifier: user.email, password: user.password },
      });
      expect(oldPasswordRes.statusCode).toBe(400);
    });
  });
});
