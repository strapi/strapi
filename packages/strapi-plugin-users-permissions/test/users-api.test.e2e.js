// Test a simple default API with no relations

const { registerAndLogin } = require('../../../test/helpers/auth');
const { createAuthRequest } = require('../../../test/helpers/request');

let rq;
let data = {};

describe('Users API', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);
  }, 60000);

  test('Create User', async () => {
    const user = {
      username: 'User 1',
      email: 'user1@strapi.io',
      password: 'test1234',
    };

    const res = await rq({
      method: 'POST',
      url: '/auth/local/register',
      body: user,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      jwt: expect.any(String),
      user: {
        username: user.username,
        email: user.email,
      },
    });
    data.user = res.body.user;
  });

  test('Delete user', async () => {
    const res = await rq({
      method: 'DELETE',
      url: `/users/${data.user.id}`,
    });

    expect(res.statusCode).toBe(200);
  });
});