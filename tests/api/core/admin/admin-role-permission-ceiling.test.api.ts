import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createUtils } from 'api-tests/utils';
import type { Core } from '@strapi/types';

/**
 * CMS-1718 — an admin managing roles cannot grant permissions they do not hold,
 * neither through a role's permissions nor by assigning an over-privileged role
 * to a user.
 */
describe('Admin RBAC permission ceiling (api)', () => {
  let strapi: Core.Strapi;
  let rq: Awaited<ReturnType<typeof createAuthRequest>>;
  let rqManager: Awaited<ReturnType<typeof createAuthRequest>>;
  let utils: ReturnType<typeof createUtils>;

  let superAdminRoleId: number;
  let managerRoleId: number;
  let targetRoleId: number;
  let managerUserId: number;
  const createdUserIds: number[] = [];

  // Held by the manager.
  const HELD_ACTION = 'admin::webhooks.read';
  // Not held by the manager.
  const LACKED_ACTION = 'admin::webhooks.create';
  // Held by the manager under a condition.
  const CONDITIONAL_ACTION = 'admin::api-tokens.read';
  const CONDITION = 'admin::is-creator';

  const permission = (action: string, conditions: string[] = []) => ({
    action,
    subject: null,
    properties: {},
    conditions,
  });

  const MANAGER_PERMISSIONS = [
    permission('admin::roles.read'),
    permission('admin::roles.create'),
    permission('admin::roles.update'),
    permission('admin::roles.delete'),
    permission('admin::users.read'),
    permission('admin::users.create'),
    permission('admin::users.update'),
    permission(HELD_ACTION),
    permission(CONDITIONAL_ACTION, [CONDITION]),
  ];

  const getRolePermissions = async (roleId: number) => {
    const res = await rq({ url: `/admin/roles/${roleId}/permissions`, method: 'GET' });
    expect(res.statusCode).toBe(200);
    return res.body.data as Array<{ action: string; conditions: string[] }>;
  };

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
    utils = createUtils(strapi);

    superAdminRoleId = (await utils.getSuperAdminRole()).id;

    const managerRole = await utils.createRole({
      name: 'ceiling-manager',
      description: 'Manages roles and users, holds a limited set of permissions',
    });
    managerRoleId = managerRole.id;
    await utils.assignPermissionsToRole(managerRoleId, MANAGER_PERMISSIONS);

    const managerUser = await utils.createUser({
      email: 'ceiling-manager@test.com',
      firstname: 'Ceiling',
      lastname: 'Manager',
      isActive: true,
      roles: [managerRoleId],
    });
    managerUserId = managerUser.id;
    rqManager = await createAuthRequest({
      strapi,
      userInfo: {
        email: 'ceiling-manager@test.com',
        firstname: 'Ceiling',
        lastname: 'Manager',
        password: 'Password123',
      },
    });

    const targetRole = await utils.createRole({
      name: 'ceiling-target',
      description: 'Role edited by the manager',
    });
    targetRoleId = targetRole.id;
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      await strapi.db.query('admin::user').delete({ where: { id } });
    }
    if (managerUserId !== undefined) {
      await strapi.db.query('admin::user').delete({ where: { id: managerUserId } });
    }
    for (const id of [targetRoleId, managerRoleId]) {
      if (id !== undefined) {
        await strapi.db.query('admin::permission').deleteMany({ where: { role: { id } } });
        await strapi.db.query('admin::role').delete({ where: { id } });
      }
    }
    await strapi.destroy();
  });

  describe('Role permissions', () => {
    test('Granting a permission the manager does not hold is refused with an explicit error', async () => {
      const res = await rqManager({
        url: `/admin/roles/${targetRoleId}/permissions`,
        method: 'PUT',
        body: { permissions: [permission(LACKED_ACTION)] },
      });

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toMatchObject({
        name: 'PermissionCeilingError',
        message: expect.stringContaining(LACKED_ACTION),
        details: {
          violations: [{ action: LACKED_ACTION, subject: null, reason: 'action-not-held' }],
        },
      });

      expect(await getRolePermissions(targetRoleId)).toEqual([]);
    });

    test('Granting a permission the manager holds is allowed', async () => {
      const res = await rqManager({
        url: `/admin/roles/${targetRoleId}/permissions`,
        method: 'PUT',
        body: { permissions: [permission(HELD_ACTION)] },
      });

      expect(res.statusCode).toBe(200);
      expect((await getRolePermissions(targetRoleId)).map((p) => p.action)).toEqual([HELD_ACTION]);
    });

    test('A conditional permission may only be granted with the same conditions', async () => {
      const unconditional = await rqManager({
        url: `/admin/roles/${targetRoleId}/permissions`,
        method: 'PUT',
        body: { permissions: [permission(HELD_ACTION), permission(CONDITIONAL_ACTION)] },
      });
      expect(unconditional.statusCode).toBe(403);
      expect(unconditional.body.error.details.violations).toEqual([
        expect.objectContaining({ action: CONDITIONAL_ACTION, reason: 'conditions-exceed' }),
      ]);

      const conditional = await rqManager({
        url: `/admin/roles/${targetRoleId}/permissions`,
        method: 'PUT',
        body: {
          permissions: [permission(HELD_ACTION), permission(CONDITIONAL_ACTION, [CONDITION])],
        },
      });
      expect(conditional.statusCode).toBe(200);
      expect(
        (await getRolePermissions(targetRoleId)).find((p) => p.action === CONDITIONAL_ACTION)
      ).toMatchObject({ conditions: [CONDITION] });
    });

    test('A permission the role already carries is preserved when re-sent unchanged', async () => {
      // The super admin grants the target role something the manager lacks.
      const seed = await rq({
        url: `/admin/roles/${targetRoleId}/permissions`,
        method: 'PUT',
        body: { permissions: [permission(HELD_ACTION), permission(LACKED_ACTION)] },
      });
      expect(seed.statusCode).toBe(200);

      // The manager re-sends it unchanged and adds a permission they hold.
      const res = await rqManager({
        url: `/admin/roles/${targetRoleId}/permissions`,
        method: 'PUT',
        body: {
          permissions: [
            permission(HELD_ACTION),
            permission(LACKED_ACTION),
            permission('admin::roles.read'),
          ],
        },
      });

      expect(res.statusCode).toBe(200);
      expect((await getRolePermissions(targetRoleId)).map((p) => p.action).sort()).toEqual(
        [HELD_ACTION, LACKED_ACTION, 'admin::roles.read'].sort()
      );
    });

    test('The super admin is not subject to the ceiling', async () => {
      const res = await rq({
        url: `/admin/roles/${targetRoleId}/permissions`,
        method: 'PUT',
        body: { permissions: [permission(LACKED_ACTION)] },
      });

      expect(res.statusCode).toBe(200);
      expect((await getRolePermissions(targetRoleId)).map((p) => p.action)).toEqual([
        LACKED_ACTION,
      ]);
    });
  });

  describe('Role assignment on users', () => {
    const newUser = (email: string, roles: number[]) => ({
      firstname: 'Ceiling',
      lastname: 'Invitee',
      email,
      roles,
    });

    test('Creating a user with a role that exceeds the ceiling is refused', async () => {
      // The target role now carries LACKED_ACTION (granted by the super admin above).
      const res = await rqManager({
        url: '/admin/users',
        method: 'POST',
        body: newUser('ceiling-invitee-1@test.com', [targetRoleId]),
      });

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toMatchObject({
        name: 'PermissionCeilingError',
        details: {
          violations: [
            expect.objectContaining({
              roleId: String(targetRoleId),
              violations: [expect.objectContaining({ action: LACKED_ACTION })],
            }),
          ],
        },
      });
    });

    test('Creating a user with the super admin role is refused', async () => {
      const res = await rqManager({
        url: '/admin/users',
        method: 'POST',
        body: newUser('ceiling-invitee-2@test.com', [superAdminRoleId]),
      });

      expect(res.statusCode).toBe(403);
    });

    test('Creating a user with a role within the ceiling is allowed', async () => {
      const res = await rqManager({
        url: '/admin/users',
        method: 'POST',
        body: newUser('ceiling-invitee-3@test.com', [managerRoleId]),
      });

      expect(res.statusCode).toBe(201);
      createdUserIds.push(res.body.data.id);
    });

    test('Adding an over-privileged role to an existing user is refused, other edits pass', async () => {
      const userId = createdUserIds[0];

      const escalate = await rqManager({
        url: `/admin/users/${userId}`,
        method: 'PUT',
        body: { roles: [managerRoleId, superAdminRoleId] },
      });
      expect(escalate.statusCode).toBe(403);

      const rename = await rqManager({
        url: `/admin/users/${userId}`,
        method: 'PUT',
        body: { firstname: 'Renamed', roles: [managerRoleId] },
      });
      expect(rename.statusCode).toBe(200);
      expect(rename.body.data.firstname).toBe('Renamed');
    });

    test('A duplicate email carries the EMAIL_ALREADY_TAKEN code', async () => {
      const res = await rq({
        url: '/admin/users',
        method: 'POST',
        body: newUser('ceiling-invitee-3@test.com', [managerRoleId]),
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatchObject({
        message: 'Email already taken',
        details: { code: 'EMAIL_ALREADY_TAKEN' },
      });
    });
  });
});
