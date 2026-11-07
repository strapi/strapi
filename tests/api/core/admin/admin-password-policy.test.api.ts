'use strict';

import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest, createRequest } from 'api-tests/request';
import { createUtils } from 'api-tests/utils';

const DEFAULT_POLICY = {
  minLength: 8,
  requireLowercase: true,
  requireUppercase: true,
  requireNumber: true,
  requireSpecialCharacter: false,
};

const STRICT_POLICY = { ...DEFAULT_POLICY, minLength: 14, requireSpecialCharacter: true };

describe('Admin password policy', () => {
  let strapi: any;
  let utils: any;
  let anonymousRq: any;
  let superAdminRq: any;
  let editorRq: any;
  let targetUser: any;
  let role: any;
  let editor: any;
  let readerRole: any;
  let updaterRole: any;
  let readerRq: any;
  let updaterRq: any;
  const extraUsers: any[] = [];

  const editorPassword = 'Editor12345';

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    utils = createUtils(strapi);
    anonymousRq = createRequest({ strapi });
    superAdminRq = await createAuthRequest({ strapi });

    role = await utils.createRole({
      name: 'password_policy_test_role',
      description: 'Only used for the password policy api tests',
    });

    editor = await utils.createUser({
      firstname: 'Editor',
      email: 'password-policy-editor@strapi.io',
      password: editorPassword,
      isActive: true,
      roles: [role.id],
    });

    targetUser = await utils.createUser({
      firstname: 'Target',
      email: 'password-policy-target@strapi.io',
      password: 'Target12345',
      isActive: true,
      roles: [role.id],
    });

    editorRq = await createAuthRequest({
      strapi,
      userInfo: { email: editor.email, password: editorPassword },
    });

    // One role per action, to tell apart what `read` and `update` allow
    const createUserWithAction = async (action: string) => {
      const actionRole = await utils.createRole({
        name: `password_policy_${action}_role`,
        description: 'Only used for the password policy api tests',
      });

      await utils.assignPermissionsToRole(actionRole.id, [
        { action, subject: null, conditions: [], properties: {} },
      ]);

      const user = await utils.createUser({
        firstname: 'Action',
        email: `password-policy-${action.replace(/\W/g, '-')}@strapi.io`,
        password: editorPassword,
        isActive: true,
        roles: [actionRole.id],
      });
      extraUsers.push(user);

      const rq = await createAuthRequest({
        strapi,
        userInfo: { email: user.email, password: editorPassword },
      });

      return { role: actionRole, rq };
    };

    ({ role: readerRole, rq: readerRq } = await createUserWithAction(
      'admin::password-policy.read'
    ));
    ({ role: updaterRole, rq: updaterRq } = await createUserWithAction(
      'admin::password-policy.update'
    ));
  });

  afterEach(async () => {
    await strapi.service('admin::password-policy').updatePolicy(DEFAULT_POLICY);
  });

  afterAll(async () => {
    await utils.deleteUserById(editor.id);
    await utils.deleteUserById(targetUser.id);
    for (const user of extraUsers) {
      await utils.deleteUserById(user.id);
    }
    await utils.deleteRolesById([role.id, readerRole.id, updaterRole.id]);
    await strapi.destroy();
  });

  describe('GET /admin/password-policy', () => {
    test('Is public, as the registration and reset-password pages need it before login', async () => {
      const res = await anonymousRq({ method: 'GET', url: '/admin/password-policy' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toEqual(DEFAULT_POLICY);
    });
  });

  describe('PUT /admin/password-policy', () => {
    const update = (rq: any, body: unknown) =>
      rq({ method: 'PUT', url: '/admin/password-policy', body });

    test('Rejects an anonymous request', async () => {
      const res = await update(anonymousRq, STRICT_POLICY);

      expect(res.statusCode).toBe(401);
    });

    test('Returns a 403 without the admin::password-policy.update permission', async () => {
      const res = await update(editorRq, STRICT_POLICY);

      expect(res.statusCode).toBe(403);
      await expect(strapi.service('admin::password-policy').getPolicy()).resolves.toEqual(
        DEFAULT_POLICY
      );
    });

    test('Returns a 403 with only the admin::password-policy.read permission', async () => {
      const res = await update(readerRq, STRICT_POLICY);

      expect(res.statusCode).toBe(403);
      await expect(strapi.service('admin::password-policy').getPolicy()).resolves.toEqual(
        DEFAULT_POLICY
      );
    });

    test('Lets a user with only the admin::password-policy.update permission update it', async () => {
      const res = await update(updaterRq, STRICT_POLICY);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toEqual(STRICT_POLICY);
    });

    test('Lets a super admin update the policy', async () => {
      const res = await update(superAdminRq, STRICT_POLICY);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toEqual(STRICT_POLICY);

      const { body } = await anonymousRq({ method: 'GET', url: '/admin/password-policy' });

      expect(body.data).toEqual(STRICT_POLICY);
    });

    test('Rejects a minimum length below the floor', async () => {
      const res = await update(superAdminRq, { ...DEFAULT_POLICY, minLength: 4 });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('Password updates', () => {
    const updateUser = (body: unknown) =>
      superAdminRq({ method: 'PUT', url: `/admin/users/${targetUser.id}`, body });

    const updateMe = (body: unknown) => editorRq({ method: 'PUT', url: '/admin/users/me', body });

    const setStrictPolicy = () =>
      strapi.service('admin::password-policy').updatePolicy(STRICT_POLICY);

    test('The stored policy rejects a password on PUT /admin/users/:id', async () => {
      await setStrictPolicy();

      // Complies with the default policy, not with the stored one
      const res = await updateUser({ password: 'Target123456' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.name).toBe('ValidationError');
    });

    test('The stored policy rejects a password on PUT /admin/users/me', async () => {
      await setStrictPolicy();

      const res = await updateMe({ password: 'Editor123456', currentPassword: editorPassword });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.name).toBe('ValidationError');
    });

    test('A password complying with the stored policy is accepted', async () => {
      await setStrictPolicy();

      const res = await updateUser({ password: 'Target-123456789' });

      expect(res.statusCode).toBe(200);
    });

    test('An empty password is rejected on PUT /admin/users/:id', async () => {
      const res = await updateUser({ password: '' });

      expect(res.statusCode).toBe(400);
    });

    test('An empty password is rejected on PUT /admin/users/me', async () => {
      const withCurrentPassword = await updateMe({
        password: '',
        currentPassword: editorPassword,
      });
      const withoutCurrentPassword = await updateMe({ password: '' });

      expect(withCurrentPassword.statusCode).toBe(400);
      expect(withoutCurrentPassword.statusCode).toBe(400);

      // The password did not change: the user can still log in with it
      const login = await anonymousRq({
        method: 'POST',
        url: '/admin/login',
        body: { email: editor.email, password: editorPassword },
      });

      expect(login.statusCode).toBe(200);
    });
  });

  describe('Public password routes', () => {
    const lengthError = (path: string) =>
      expect.objectContaining({
        path: path.split('.'),
        message: `${path} must be at least ${STRICT_POLICY.minLength} characters`,
      });

    beforeEach(async () => {
      await strapi.service('admin::password-policy').updatePolicy(STRICT_POLICY);
    });

    test('The stored policy rejects a password on POST /admin/register', async () => {
      const registrationToken = 'password-policy-registration-token';
      const invitee = await utils.createUser({
        firstname: 'Invitee',
        email: 'password-policy-invitee@strapi.io',
        roles: [role.id],
        registrationToken,
        isActive: false,
      });
      extraUsers.push(invitee);

      const res = await anonymousRq({
        method: 'POST',
        url: '/admin/register',
        body: {
          registrationToken,
          userInfo: { firstname: 'Invitee', lastname: 'User', password: 'Invitee12345' },
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.details.errors).toContainEqual(lengthError('userInfo.password'));
    });

    test('The stored policy rejects a password on POST /admin/register-admin', async () => {
      // The route only accepts a body once its schema is valid, before checking for admins
      const res = await anonymousRq({
        method: 'POST',
        url: '/admin/register-admin',
        body: {
          email: 'password-policy-first-admin@strapi.io',
          firstname: 'First',
          lastname: 'Admin',
          password: 'FirstAdmin123',
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.details.errors).toContainEqual(lengthError('password'));
    });

    test('The stored policy rejects a password on POST /admin/reset-password', async () => {
      const resetPasswordToken = 'password-policy-reset-token';
      const resetUser = await utils.createUser({
        firstname: 'Reset',
        email: 'password-policy-reset@strapi.io',
        password: editorPassword,
        isActive: true,
        roles: [role.id],
        resetPasswordToken,
        resetPasswordTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      extraUsers.push(resetUser);

      const res = await anonymousRq({
        method: 'POST',
        url: '/admin/reset-password',
        body: { resetPasswordToken, password: 'Reset1234567' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.details.errors).toContainEqual(lengthError('password'));

      const compliant = await anonymousRq({
        method: 'POST',
        url: '/admin/reset-password',
        body: { resetPasswordToken, password: 'Reset-123456789' },
      });

      expect(compliant.statusCode).toBe(200);
    });
  });
});
