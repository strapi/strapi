'use strict';

const { registerAndLogin } = require('../../../test/helpers/auth');
const { createAuthRequest } = require('../../../test/helpers/request');
const expectedPermissions = require('./permissions');

let rq;

describe('Role CRUD End to End', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);
  }, 60000);

  test('Can get the existing permissions', async () => {
    let res = await rq({
      url: '/admin/permissions',
      method: 'GET',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject(expectedPermissions);
  });
});
