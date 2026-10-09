'use strict';

const _ = require('lodash');

const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const { createUtils } = require('api-tests/utils');

const data = {
  rolesWithUsers: [],
  rolesWithoutUsers: [],
  users: [],
  deleteRolesIds: [],
  superAdminRole: undefined,
  authorRole: undefined,
  editorRole: undefined,
};

const omitTimestamps = (obj) => _.omit(obj, ['updatedAt', 'createdAt']);

describe('Role CRUD End to End', () => {
  let rq;
  let strapi;

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  describe('Default roles', () => {
    test('Default roles are created', async () => {
      const defaultsRoles = [
        {
          name: 'Super Admin',
          code: 'strapi-super-admin',
          description: 'Super Admins can access and manage all features and settings.',
          usersCount: 1,
        },
        {
          name: 'Editor',
          code: 'strapi-editor',
          description: 'Editors can manage and publish contents including those of other users.',
          usersCount: 0,
        },
        {
          name: 'Author',
          code: 'strapi-author',
          description: 'Authors can manage the content they have created.',
          usersCount: 0,
        },
      ];

      const res = await rq({
        url: '/admin/roles',
        method: 'GET',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining(defaultsRoles[0]),
          expect.objectContaining(defaultsRoles[1]),
          expect.objectContaining(defaultsRoles[2]),
        ])
      );
      data.superAdminRole = res.body.data.find((r) => r.code === 'strapi-super-admin');
      data.authorRole = res.body.data.find((r) => r.code === 'strapi-author');
      data.editorRole = res.body.data.find((r) => r.code === 'strapi-editor');
    });

    test('Author have admin::is-creator condition for every permission', async () => {
      const res = await rq({
        url: `/admin/roles/${data.authorRole.id}/permissions`,
        method: 'GET',
      });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(6);
      res.body.data
        .filter((p) => !p.action.includes('plugin::upload'))
        .forEach((permission) => {
          expect(permission.conditions).toEqual(['admin::is-creator']);
        });
    });

    test("Editor's permissions don't have any conditions", async () => {
      const res = await rq({
        url: `/admin/roles/${data.editorRole.id}/permissions`,
        method: 'GET',
      });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(6);
      res.body.data
        .filter((p) => !p.action.includes('plugin::upload'))
        .forEach((permission) => {
          expect(permission.conditions).toEqual([]);
        });
    });

    const newPermissions = [
      {
        action: 'plugin::users-permissions.roles.update',
      },
      {
        action: 'plugin::content-manager.explorer.create',
        subject: 'plugin::users-permissions.user',
        properties: { fields: ['username'], locales: [] },
        conditions: ['admin::is-creator'],
      },
    ];

    test('Conditions of editors and author can be modified', async () => {
      let res = await rq({
        url: `/admin/roles/${data.editorRole.id}/permissions`,
        method: 'PUT',
        body: { permissions: newPermissions },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            action: 'plugin::users-permissions.roles.update',
            properties: {},
            conditions: [],
            subject: null,
          }),
          expect.objectContaining({
            action: 'plugin::content-manager.explorer.create',
            subject: 'plugin::users-permissions.user',
            properties: { fields: ['username'], locales: [] },
            conditions: ['admin::is-creator'],
          }),
        ]),
      });

      res = await rq({
        url: `/admin/roles/${data.authorRole.id}/permissions`,
        method: 'PUT',
        body: { permissions: newPermissions },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            action: 'plugin::users-permissions.roles.update',
            properties: {},
            conditions: [],
            subject: null,
          }),
          expect.objectContaining({
            action: 'plugin::content-manager.explorer.create',
            subject: 'plugin::users-permissions.user',
            properties: { fields: ['username'], locales: [] },
            conditions: ['admin::is-creator'],
          }),
        ]),
      });
    });
  });

  describe('Create some roles', () => {
    const rolesToCreate = [
      [{ name: 'new role 0', description: 'description' }],
      [{ name: 'new role 1', description: 'description' }],
      [{ name: 'new role 2', description: 'description' }],
      [{ name: 'new role 3', description: 'description' }],
      [{ name: 'new role 4', description: 'description' }],
      [{ name: 'new role 5', description: 'description' }],
    ];

    test.each(rolesToCreate)('can create %p', async (role) => {
      const res = await rq({
        url: '/admin/roles',
        method: 'POST',
        body: role,
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.data).toMatchObject({
        id: expect.anything(),
        name: role.name,
        description: role.description,
      });
      data.rolesWithoutUsers.push(res.body.data);
    });
    test('Cannot create a role already existing', async () => {
      const role = _.pick(data.rolesWithoutUsers[0], ['name', 'description']);
      const res = await rq({
        url: '/admin/roles',
        method: 'POST',
        body: role,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        data: null,
        error: {
          details: {},
          message: 'The name must be unique and a role with name `new role 0` already exists.',
          name: 'ApplicationError',
          status: 400,
        },
      });
    });
    test('Can create a user with a role', async () => {
      const user = {
        email: 'new-user@strapi.io',
        firstname: 'New',
        lastname: 'User',
        roles: [data.rolesWithoutUsers[5].id],
      };

      const res = await rq({
        url: '/admin/users',
        method: 'POST',
        body: user,
      });

      expect(res.statusCode).toBe(201);

      data.users.push(res.body.data);
      data.rolesWithUsers.push(data.rolesWithoutUsers[5]);
      data.rolesWithoutUsers.splice(5, 1);
    });
  });

  describe('Find a role', () => {
    test('Can find a role successfully', async () => {
      const res = await rq({
        url: `/admin/roles/${data.rolesWithoutUsers[0].id}`,
        method: 'GET',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toMatchObject({
        id: data.rolesWithoutUsers[0].id,
        name: data.rolesWithoutUsers[0].name,
        description: data.rolesWithoutUsers[0].description,
        usersCount: 0,
        code: expect.anything(),
      });
      expect(res.body.data.code.startsWith('new-role-0')).toBe(true);
    });
  });

  describe('Find all roles', () => {
    test('Can find all roles successfully', async () => {
      const expectedRolesWithoutUser = data.rolesWithoutUsers.map((r) => ({
        ...r,
        usersCount: 0,
      }));
      const expectedRolesWithUser = data.rolesWithUsers.map((r) => ({ ...r, usersCount: 1 }));
      const expectedRoles = expectedRolesWithoutUser.concat(expectedRolesWithUser);

      const res = await rq({
        url: '/admin/roles',
        method: 'GET',
      });

      expect(res.statusCode).toBe(200);
      expectedRoles.forEach((role) => {
        expect(res.body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: role.id,
              name: role.name,
              description: role.description,
              usersCount: role.usersCount,
              code: expect.anything(),
            }),
          ])
        );
      });
    });
  });

  describe('Update a role', () => {
    test('Can update name and description of a role successfully', async () => {
      const updates = {
        name: 'new name - Cannot update the name of a role',
        description: 'new description - Can update a role successfully',
      };
      const res = await rq({
        url: `/admin/roles/${data.rolesWithoutUsers[0].id}`,
        method: 'PUT',
        body: updates,
      });

      expect(res.statusCode).toBe(200);
      expect(omitTimestamps(res.body.data)).toMatchObject({
        ...omitTimestamps(data.rolesWithoutUsers[0]),
        ...updates,
      });
      data.rolesWithoutUsers[0] = res.body.data;
    });

    test('Can update description of a role successfully', async () => {
      const updates = {
        name: 'new name - Cannot update the name of a role',
        description: 'new description - Can update description of a role successfully',
      };
      const res = await rq({
        url: `/admin/roles/${data.rolesWithoutUsers[0].id}`,
        method: 'PUT',
        body: updates,
      });

      expect(res.statusCode).toBe(200);
      expect(omitTimestamps(res.body.data)).toMatchObject({
        ...omitTimestamps(data.rolesWithoutUsers[0]),
        ...updates,
      });
      data.rolesWithoutUsers[0] = res.body.data;
    });

    test('Cannot update the name of a role if already exists', async () => {
      const updates = {
        name: data.rolesWithoutUsers[0].name,
        description: 'new description - Cannot update the name of a role if already exists',
      };
      const res = await rq({
        url: `/admin/roles/${data.rolesWithoutUsers[1].id}`,
        method: 'PUT',
        body: updates,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        data: null,
        error: {
          details: {},
          message:
            'The name must be unique and a role with name `new name - Cannot update the name of a role` already exists.',
          name: 'ApplicationError',
          status: 400,
        },
      });
    });

    test('Cannot update super admin role', async () => {
      const updates = {
        name: 'new name - Cannot update the name of a role',
        description: 'new description - Can update a role successfully',
      };
      const res = await rq({
        url: `/admin/roles/${data.superAdminRole.id}`,
        method: 'PUT',
        body: updates,
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('Delete roles', () => {
    describe('batch-delete', () => {
      test("Don't delete the roles if some still have assigned users", async () => {
        const roles = [data.rolesWithUsers[0], data.rolesWithUsers[0]];
        const rolesIds = roles.map((r) => r.id);
        let res = await rq({
          url: '/admin/roles/batch-delete',
          method: 'POST',
          body: { ids: rolesIds },
        });

        expect(res.statusCode).toBe(400);
        expect(res.body).toMatchObject({
          data: null,
          error: {
            details: {
              errors: [
                {
                  message: 'Some roles are still assigned to some users',
                  name: 'ValidationError',
                  path: ['ids'],
                },
              ],
            },
            message: 'Some roles are still assigned to some users',
            name: 'ValidationError',
            status: 400,
          },
        });

        for (const role of roles) {
          res = await rq({
            url: `/admin/roles/${role.id}`,
            method: 'GET',
          });
          expect(res.statusCode).toBe(200);
          expect(res.body.data).toMatchObject(role);
        }
      });

      test('Can delete a role', async () => {
        let res = await rq({
          url: '/admin/roles/batch-delete',
          method: 'POST',
          body: { ids: [data.rolesWithoutUsers[0].id] },
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.data).toMatchObject([data.rolesWithoutUsers[0]]);

        res = await rq({
          url: `/admin/roles/${data.rolesWithoutUsers[0].id}`,
          method: 'GET',
        });
        expect(res.statusCode).toBe(404);

        data.deleteRolesIds.push(data.rolesWithoutUsers[0].id);
        data.rolesWithoutUsers.shift();
      });

      test('Can delete two roles', async () => {
        const roles = data.rolesWithoutUsers.slice(0, 2);
        const rolesIds = roles.map((r) => r.id);

        let res = await rq({
          url: '/admin/roles/batch-delete',
          method: 'POST',
          body: { ids: rolesIds },
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.data).toMatchObject(roles);

        for (const roleId of rolesIds) {
          res = await rq({
            url: `/admin/roles/${roleId}`,
            method: 'GET',
          });
          expect(res.statusCode).toBe(404);
          data.deleteRolesIds.push(data.rolesWithoutUsers[0].id);
          data.rolesWithoutUsers.shift();
        }
      });
    });

    describe('simple delete', () => {
      test('Can delete a role', async () => {
        let res = await rq({
          url: `/admin/roles/${data.rolesWithoutUsers[0].id}`,
          method: 'DELETE',
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.data).toMatchObject(data.rolesWithoutUsers[0]);

        res = await rq({
          url: `/admin/roles/${data.rolesWithoutUsers[0].id}`,
          method: 'GET',
        });
        expect(res.statusCode).toBe(404);

        data.deleteRolesIds.push(data.rolesWithoutUsers[0].id);
        data.rolesWithoutUsers.shift();
      });

      test("Don't delete a role if it still has assigned users", async () => {
        let res = await rq({
          url: `/admin/roles/${data.rolesWithUsers[0].id}`,
          method: 'DELETE',
        });

        expect(res.statusCode).toBe(400);
        expect(res.body).toMatchObject({
          data: null,
          error: {
            details: {
              errors: [
                {
                  message: 'Some roles are still assigned to some users',
                  name: 'ValidationError',
                  path: ['id'],
                },
              ],
            },
            message: 'Some roles are still assigned to some users',
            name: 'ValidationError',
            status: 400,
          },
        });

        res = await rq({
          url: `/admin/roles/${data.rolesWithUsers[0].id}`,
          method: 'GET',
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.data).toMatchObject(data.rolesWithUsers[0]);
      });

      test("Can't delete super admin role", async () => {
        let res = await rq({
          url: `/admin/roles/${data.superAdminRole.id}`,
          method: 'DELETE',
        });

        expect(res.statusCode).toBe(400);
        expect(res.body).toMatchObject({
          data: null,
          error: {
            details: {
              errors: [
                {
                  message: 'You cannot delete the super admin role',
                  name: 'ValidationError',
                  path: ['id'],
                },
              ],
            },
            message: 'You cannot delete the super admin role',
            name: 'ValidationError',
            status: 400,
          },
        });

        res = await rq({
          url: `/admin/roles/${data.rolesWithUsers[0].id}`,
          method: 'GET',
        });
        expect(res.statusCode).toBe(200);
        expect(res.body.data).toMatchObject(data.rolesWithUsers[0]);
      });
    });
  });

  describe("Roles don't exist", () => {
    test("Cannot update a role if it doesn't exist", async () => {
      const updates = {
        name: "new name - Cannot update a role if it doesn't exist",
        description: "new description - Cannot update a role if it doesn't exist",
      };
      const res = await rq({
        url: `/admin/roles/${data.deleteRolesIds[0]}`,
        method: 'PUT',
        body: updates,
      });

      expect(res.statusCode).toBe(404);
      expect(res.body).toMatchObject({
        error: {
          details: {},
          message: 'role.notFound',
          name: 'NotFoundError',
          status: 404,
        },
      });
    });

    test("Simple delete - No error if deleting a role that doesn't exist", async () => {
      const res = await rq({
        url: `/admin/roles/${data.deleteRolesIds[0]}`,
        method: 'DELETE',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toEqual(null);
    });
    test("Batch Delete - No error if deleting a role that doesn't exist", async () => {
      const res = await rq({
        url: '/admin/roles/batch-delete',
        method: 'POST',
        body: { ids: [data.deleteRolesIds[0]] },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('get & update Permissions', () => {
    test('get permissions on empty role', async () => {
      const res = await rq({
        url: `/admin/roles/${data.rolesWithoutUsers[0].id}/permissions`,
        method: 'GET',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        data: [],
      });
    });

    test('assign permissions on role', async () => {
      const res = await rq({
        url: `/admin/roles/${data.rolesWithoutUsers[0].id}/permissions`,
        method: 'PUT',
        body: {
          permissions: [
            {
              action: 'plugin::users-permissions.roles.update',
            },
            {
              action: 'plugin::content-manager.explorer.create',
              subject: 'plugin::users-permissions.user',
              properties: { fields: ['username'], locales: [] },
              conditions: ['admin::is-creator'],
            },
          ],
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length > 0).toBe(true);
      res.body.data.forEach((permission) => {
        expect(permission).toMatchObject({
          id: expect.anything(),
          action: expect.any(String),
          subject: expect.stringOrNull(),
        });

        if (permission.conditions.length > 0) {
          expect(permission.conditions).toEqual(expect.arrayContaining([expect.any(String)]));
        }
        if (permission.fields && permission.fields.length > 0) {
          expect(permission.fields).toEqual(expect.arrayContaining([expect.any(String)]));
        }
      });
    });

    test('assign permissions on role with an unknown condition', async () => {
      const permissions = [
        {
          action: 'plugin::users-permissions.roles.update',
        },
        {
          action: 'plugin::content-manager.explorer.create',
          subject: 'plugin::users-permissions.user',
          properties: { fields: ['username'], locales: [] },
          conditions: ['admin::is-creator'],
        },
      ];
      const res = await rq({
        url: `/admin/roles/${data.rolesWithoutUsers[0].id}/permissions`,
        method: 'PUT',
        body: {
          permissions: [
            permissions[0],
            {
              ...permissions[1],
              conditions: [...permissions[1].conditions, 'unknown-condition'],
            },
          ],
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toMatchObject(permissions[1]);
    });

    test("can't assign non-existing permissions on role", async () => {
      const res = await rq({
        url: `/admin/roles/${data.rolesWithoutUsers[0].id}/permissions`,
        method: 'PUT',
        body: {
          permissions: [
            {
              action: 'non.existing.action',
            },
          ],
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        data: null,
        error: {
          details: {
            errors: [
              {
                message: 'action is not an existing permission action',
                name: 'ValidationError',
                path: ['permissions', '0', 'action'],
              },
            ],
          },
          message: 'action is not an existing permission action',
          name: 'ValidationError',
          status: 400,
        },
      });
    });

    test('get permissions role', async () => {
      const res = await rq({
        url: `/admin/roles/${data.rolesWithoutUsers[0].id}/permissions`,
        method: 'GET',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length > 0).toBe(true);

      res.body.data.forEach((permission) => {
        expect(permission).toMatchObject({
          id: expect.anything(),
          action: expect.any(String),
          subject: expect.stringOrNull(),
        });

        if (permission.conditions.length > 0) {
          expect(permission.conditions).toEqual(expect.arrayContaining([expect.any(String)]));
        }
        if (permission.fields && permission.fields.length > 0) {
          expect(permission.fields).toEqual(expect.arrayContaining([expect.any(String)]));
        }
      });
    });
  });

  /**
   * An admin who can update roles must not be able to grant a permission they do not hold
   * themselves (action + subject, properties and conditions). Permissions a role already
   * holds are preserved on save, and super admins are not restricted.
   */
  describe('Permissions ceiling', () => {
    const READ_ACTION = 'plugin::content-manager.explorer.read';
    const CREATE_ACTION = 'plugin::content-manager.explorer.create';
    const SUBJECT = 'plugin::users-permissions.user';
    const OUT_OF_SCOPE_ACTION = 'plugin::users-permissions.roles.update';

    let utils;
    let requesterRole;
    let targetRole;
    let requester;
    let rqRequester;

    const updateTargetRolePermissions = (request, permissions) =>
      request({
        url: `/admin/roles/${targetRole.id}/permissions`,
        method: 'PUT',
        body: { permissions },
      });

    const getTargetRolePermissions = async () => {
      const res = await rq({ url: `/admin/roles/${targetRole.id}/permissions`, method: 'GET' });

      return res.body.data;
    };

    beforeAll(async () => {
      utils = createUtils(strapi);

      // The requester can manage roles but only holds a restricted set of content permissions
      requesterRole = await utils.createRole({
        name: 'ceiling-requester-role',
        description: 'Can update roles with a restricted set of content permissions',
      });

      await utils.assignPermissionsToRole(requesterRole.id, [
        { action: 'admin::roles.read', subject: null, conditions: [], properties: {} },
        { action: 'admin::roles.update', subject: null, conditions: [], properties: {} },
        {
          action: READ_ACTION,
          subject: SUBJECT,
          conditions: [],
          properties: { fields: ['username', 'email'] },
        },
        {
          action: CREATE_ACTION,
          subject: SUBJECT,
          conditions: ['admin::is-creator'],
          properties: { fields: ['username'] },
        },
      ]);

      targetRole = await utils.createRole({
        name: 'ceiling-target-role',
        description: 'Role edited by the requester',
      });

      requester = await utils.createUser({
        email: 'ceiling-requester@strapi.io',
        firstname: 'Ceiling',
        lastname: 'Requester',
        isActive: true,
        roles: [requesterRole.id],
      });

      rqRequester = await createAuthRequest({ strapi, userInfo: { email: requester.email } });
    });

    afterAll(async () => {
      await utils.deleteUserById(requester.id);
      await utils.deleteRolesById([targetRole.id, requesterRole.id]);
    });

    test('Can grant permissions within the requester own permissions', async () => {
      const res = await updateTargetRolePermissions(rqRequester, [
        {
          action: READ_ACTION,
          subject: SUBJECT,
          properties: { fields: ['username'] },
          conditions: [],
        },
        {
          action: CREATE_ACTION,
          subject: SUBJECT,
          properties: { fields: ['username'] },
          conditions: ['admin::is-creator'],
        },
      ]);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    test('Cannot grant permissions the requester does not hold', async () => {
      const permissions = [
        // action + subject the requester does not hold
        { action: OUT_OF_SCOPE_ACTION, subject: null, properties: {}, conditions: [] },
        // fields outside the requester's own fields
        {
          action: READ_ACTION,
          subject: SUBJECT,
          properties: { fields: ['username', 'provider'] },
          conditions: [],
        },
        // the requester only holds this permission with a condition
        {
          action: CREATE_ACTION,
          subject: SUBJECT,
          properties: { fields: ['username'] },
          conditions: [],
        },
      ];

      const res = await updateTargetRolePermissions(rqRequester, permissions);

      expect(res.statusCode).toBe(403);
      expect(res.body).toMatchObject({
        data: null,
        error: {
          status: 403,
          name: 'ForbiddenError',
          message: 'You cannot grant permissions you do not hold yourself',
          details: { permissions },
        },
      });

      // Nothing was written: the role still has the permissions granted in the previous test
      const rolePermissions = await getTargetRolePermissions();
      expect(rolePermissions).toHaveLength(2);
      expect(rolePermissions.map(({ action }) => action).sort()).toEqual(
        [CREATE_ACTION, READ_ACTION].sort()
      );
    });

    test('Preserves permissions the role already holds, even if the requester does not hold them', async () => {
      const outOfScopePermission = {
        action: OUT_OF_SCOPE_ACTION,
        subject: null,
        properties: {},
        conditions: [],
      };
      const inScopePermission = {
        action: READ_ACTION,
        subject: SUBJECT,
        properties: { fields: ['username'] },
        conditions: [],
      };

      // Super admins are not restricted
      const superAdminRes = await updateTargetRolePermissions(rq, [
        outOfScopePermission,
        inScopePermission,
      ]);
      expect(superAdminRes.statusCode).toBe(200);

      // Re-sending the out-of-scope permission unchanged is allowed
      const unchangedRes = await updateTargetRolePermissions(rqRequester, [
        outOfScopePermission,
        inScopePermission,
      ]);
      expect(unchangedRes.statusCode).toBe(200);
      expect(await getTargetRolePermissions()).toHaveLength(2);

      // Changing it is not
      const changedRes = await updateTargetRolePermissions(rqRequester, [
        { ...outOfScopePermission, conditions: ['admin::is-creator'] },
        inScopePermission,
      ]);
      expect(changedRes.statusCode).toBe(403);
      expect(changedRes.body.error.details.permissions).toEqual([
        { ...outOfScopePermission, conditions: ['admin::is-creator'] },
      ]);

      // Removing it is allowed
      const removalRes = await updateTargetRolePermissions(rqRequester, [inScopePermission]);
      expect(removalRes.statusCode).toBe(200);

      const rolePermissions = await getTargetRolePermissions();
      expect(rolePermissions).toHaveLength(1);
      expect(rolePermissions[0]).toMatchObject(inScopePermission);
    });
  });
});
