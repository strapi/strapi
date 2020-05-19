// Helpers.
const { registerAndLogin } = require('../../../test/helpers/auth');
const { createAuthRequest } = require('../../../test/helpers/request');

let rq;

const data = {
  roles: [],
};
describe('Role CRUD End to End', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);
  }, 60000);

  describe('Create a new role', () => {
    test.skip('Can create a role successfully', async () => {
      const role = {
        name: 'new role',
        description: 'Description of new role',
      };

      const res = await rq({
        url: '/admin/roles',
        method: 'POST',
        body: role,
      });

      data.roles.push(res);

      expect(res.statusCode).toBe(201);
      expect(res.body).toMatchObject({
        name: role.name,
        description: role.description,
      });
    });
  });

  describe('Find a role', () => {
    test.skip('Can find a role successfully', async () => {
      const res = await rq({
        url: `/admin/roles/${data.roles[0].id}`,
        method: 'GET',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toMatchObject(data.roles[0]);
    });
  });

  describe('Find all roles', () => {
    test.skip('Can find all roles successfully', async () => {
      const res = await rq({
        url: '/admin/roles',
        method: 'GET',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toMatchObject(data.roles);
    });
  });

  describe('Update a role', () => {
    test.skip('Can update a role successfully', async () => {
      const updates = {
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
      });
      data.roles[0] = res.body.data;
    });
    test.skip('Cannot update the name of a role', async () => {
      const updates = {
        description: 'new description - Cannot update the name of a role',
      };
      const res = await rq({
        url: `/admin/roles/${data.roles[0].id}`,
        method: 'PUT',
        body: updates,
      });

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
        message: 'ValidationError',
        data: {
          undefined: ['this field cannot have keys not specified in the object shape'],
        },
      });
      data.roles[0] = res.body.data;
    });
  });
});
