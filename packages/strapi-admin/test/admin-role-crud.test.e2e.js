const _ = require('lodash');

const { registerAndLogin } = require('../../../test/helpers/auth');
const { createAuthRequest } = require('../../../test/helpers/request');

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

let rq;

const data = {
  roles: [],
};

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
          created_at: expect.anything(),
          updated_at: expect.anything(),
        });
        data.roles.push(res.body.data);
      });
      test('Cannot create a role already existing', async () => {
        const role = _.pick(data.roles[0], ['name', 'description']);
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
    });

    describe('Find a role', () => {
      test('Can find a role successfully', async () => {
        const res = await rq({
          url: `/admin/roles/${data.roles[0].id}`,
          method: 'GET',
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.data).toMatchObject(data.roles[0]);
      });
    });

    describe('Find all roles', () => {
      test('Can find all roles successfully', async () => {
        const res = await rq({
          url: '/admin/roles',
          method: 'GET',
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.data).toMatchObject(data.roles);
      });
    });

    describe('Update a role', () => {
      test('Can update name and description of a role successfully', async () => {
        const updates = {
          name: 'new name - Cannot update the name of a role',
          description: 'new description - Can update a role successfully',
        };
        const res = await rq({
          url: `/admin/roles/${data.roles[0].id}`,
          method: 'PUT',
          body: updates,
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.data).toMatchObject({
          ...data.roles[0],
          ...updates,
          updated_at: expect.anything(),
        });
        data.roles[0] = res.body.data;
      });
      test('Can update description of a role successfully', async () => {
        const updates = {
          name: 'new name - Cannot update the name of a role',
          description: 'new description - Can update description of a role successfully',
        };
        const res = await rq({
          url: `/admin/roles/${data.roles[0].id}`,
          method: 'PUT',
          body: updates,
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.data).toMatchObject({
          ...data.roles[0],
          ...updates,
          updated_at: expect.anything(),
        });
        data.roles[0] = res.body.data;
      });
      test('Cannot update the name of a role if already exists', async () => {
        const updates = {
          name: data.roles[0].name,
          description: 'new description - Cannot update the name of a role if already exists',
        };
        const res = await rq({
          url: `/admin/roles/${data.roles[1].id}`,
          method: 'PUT',
          body: updates,
        });

        expect(res.statusCode).toBe(400);
        expect(res.body.data).toMatchObject({
          name: [
            `The name must be unique and a role with name \`${data.roles[0].name}\` already exists.`,
          ],
        });
      });
      test("Cannot update a role if it doesn't exist", async () => {
        const updates = {
          name: "new name - Cannot update a role if it doesn't exist",
          description: "new description - Cannot update a role if it doesn't exist",
        };
        const res = await rq({
          url: '/admin/roles/1000', // id that doesn't exist
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
    });
    describe('Delete roles', () => {
      describe('batch-delete', () => {
        test('Can delete a role', async () => {
          let res = await rq({
            url: '/admin/roles/batch-delete',
            method: 'POST',
            body: { ids: [data.roles[0].id] },
          });
          expect(res.statusCode).toBe(200);
          expect(res.body.data).toMatchObject([data.roles[0]]);

          res = await rq({
            url: `/admin/roles/${data.roles[0].id}`,
            method: 'GET',
          });
          expect(res.statusCode).toBe(404);

          data.roles.shift();
        });
        test('Can delete two roles', async () => {
          const roles = data.roles.slice(0, 2);
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
            data.roles.shift();
          }
        });
        test("No error if deleting a role that doesn't exist", async () => {
          const res = await rq({
            url: '/admin/roles/batch-delete',
            method: 'POST',
            body: { ids: ['id-that-doesnt-exist'] },
          });

          expect(res.statusCode).toBe(200);
          expect(res.body.data).toEqual([]);
        });
        test.skip("Don't delete any role if some still have assigned users", async () => {
          // TODO
        });
      });
      describe('simple delete', () => {
        test('Can delete a role', async () => {
          let res = await rq({
            url: `/admin/roles/${data.roles[0].id}`,
            method: 'DELETE',
          });
          expect(res.statusCode).toBe(200);
          expect(res.body.data).toMatchObject(data.roles[0]);

          res = await rq({
            url: `/admin/roles/${data.roles[0].id}`,
            method: 'GET',
          });
          expect(res.statusCode).toBe(404);

          data.roles.shift();
        });
        test("No error if deleting a role that doesn't exist", async () => {
          const res = await rq({
            url: '/admin/roles/id-that-doesnt-exist',
            method: 'DELETE',
          });

          expect(res.statusCode).toBe(200);
          expect(res.body.data).toEqual(null);
        });
        test.skip("Don't delete a role if it still has assigned users", async () => {
          // TODO
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
