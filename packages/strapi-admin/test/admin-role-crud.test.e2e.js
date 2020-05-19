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
      expect(res.body).toMatchObject(data[0]);
    });
  });
});
