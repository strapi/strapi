const _ = require('lodash');

const { registerAndLogin } = require('../../../test/helpers/auth');
const { createAuthRequest } = require('../../../test/helpers/request');

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

let rq;

const data = {
  rolesWithUsers: [],
  rolesWithoutUsers: [],
  users: [],
  deleteRolesIds: [],
};

const omitTimestamps = obj => _.omit(obj, ['updatedAt', 'createdAt', 'updated_at', 'created_at']);

describe('Role CRUD End to End', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);
  }, 60000);

  if (edition === 'EE') {
    describe('Create some roles', () => {
      const rolesToCreate = [
        [{ name: 'new role 0', description: 'description' }],
        [{ name: 'new role 1', description: 'description' }],
        [{ name: 'new role 2', description: 'description' }],
        [{ name: 'new role 3', description: 'description' }],
        [{ name: 'new role 4', description: 'description' }],
        [{ name: 'new role 5', description: 'description' }],
      ];
      test.each(rolesToCreate)('can create %p', async role => {
        let res = await rq({
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
        expect(res.body.data).toMatchObject({
          name: [`The name must be unique and a role with name \`${role.name}\` already exists.`],
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
        });
      });
    });

    describe('Find all roles', () => {
      test('Can find all roles successfully', async () => {
        const expectedRolesWithoutUser = data.rolesWithoutUsers.map(r => ({ ...r, usersCount: 0 }));
        const expectedRolesWithUser = data.rolesWithUsers.map(r => ({ ...r, usersCount: 1 }));
        const expectedRoles = expectedRolesWithoutUser.concat(expectedRolesWithUser);

        const res = await rq({
          url: '/admin/roles',
          method: 'GET',
        });

        expect(res.statusCode).toBe(200);
        expectedRoles.forEach(role => {
          expect(res.body.data).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                id: role.id,
                name: role.name,
                description: role.description,
                usersCount: role.usersCount,
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
        expect(res.body.data).toMatchObject({
          name: [
            `The name must be unique and a role with name \`${data.rolesWithoutUsers[0].name}\` already exists.`,
          ],
        });
      });
    });
    describe('Delete roles', () => {
      describe('batch-delete', () => {
        test("Don't delete the roles if some still have assigned users", async () => {
          const roles = [data.rolesWithUsers[0], data.rolesWithUsers[0]];
          const rolesIds = roles.map(r => r.id);
          let res = await rq({
            url: '/admin/roles/batch-delete',
            method: 'POST',
            body: { ids: rolesIds },
          });

          expect(res.statusCode).toBe(400);
          expect(res.body.data).toMatchObject({
            ids: ['Some roles are still assigned to some users.'],
          });

          for (let role of roles) {
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
          const rolesIds = roles.map(r => r.id);

          let res = await rq({
            url: '/admin/roles/batch-delete',
            method: 'POST',
            body: { ids: rolesIds },
          });
          expect(res.statusCode).toBe(200);
          expect(res.body.data).toMatchObject(roles);

          for (let roleId of rolesIds) {
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
          expect(res.body.data).toMatchObject({
            ids: ['Some roles are still assigned to some users.'],
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
          statusCode: 404,
          error: 'Not Found',
          message: 'entry.notFound',
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
                action: 'plugins::users-permissions.roles.update',
              },
              {
                action: 'plugins::content-manager.create',
                subject: 'plugins::users-permissions.user',
                conditions: ['isOwner'],
              },
            ],
          },
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.data.length > 0).toBe(true);
        res.body.data.forEach(permission => {
          expect(permission).toMatchObject({
            id: expect.anything(),
            action: expect.any(String),
            subject: expect.stringOrNull(),
          });

          if (permission.conditions.length > 0) {
            expect(permission.conditions).toEqual(expect.arrayContaining([expect.any(String)]));
          }
          if (permission.fields.length > 0) {
            expect(permission.fields).toEqual(expect.arrayContaining([expect.any(String)]));
          }
        });
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
          statusCode: 400,
          error: 'Bad Request',
          message:
            'ValidationError\', \'This action doesn\'t exist: {"action":"non.existing.action"}',
        });
      });

      test('get permissions role', async () => {
        const res = await rq({
          url: `/admin/roles/${data.rolesWithoutUsers[0].id}/permissions`,
          method: 'GET',
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.data.length > 0).toBe(true);
        res.body.data.forEach(permission => {
          expect(permission).toMatchObject({
            id: expect.anything(),
            action: expect.any(String),
            subject: expect.stringOrNull(),
          });

          if (permission.conditions.length > 0) {
            expect(permission.conditions).toEqual(expect.arrayContaining([expect.any(String)]));
          }
          if (permission.fields.length > 0) {
            expect(permission.fields).toEqual(expect.arrayContaining([expect.any(String)]));
          }
        });
      });
    });
  }

  if (edition === 'CE') {
    describe('Cannot create a new role', () => {
      test('Cannot create a role successfully', async () => {
        const role = {
          name: 'new role',
          description: 'Description of new role',
        };

        const res = await rq({
          url: '/admin/roles',
          method: 'POST',
          body: role,
        });

        expect(res.statusCode).toBe(404);
        expect(res.body).toMatchObject({
          statusCode: 404,
          error: 'Not Found',
          message: 'entry.notFound',
        });
      });
    });
  }
});
