import { createAuthRequest } from 'api-tests/request';

import { createEndUsersInstance } from '../utils/create-end-users-instance';

const SETTINGS = '/end-users/settings';
const ROLES = '/end-users/roles';

describe('end-users compat: users', () => {
  let strapi;
  let rqAdmin;

  beforeAll(async () => {
    strapi = await createEndUsersInstance({ pluginConfig: { compat: { usersPermissions: true } } });
    rqAdmin = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  it('shows the compat summary to an admin, without a secret', async () => {
    const res = await rqAdmin.get(SETTINGS);

    expect(res.status).toBe(200);
    expect(res.body.meta.config.compat).toMatchObject({
      usersPermissions: true,
      refresh: { enabled: false, httpOnly: false, cookieName: 'strapi_up_refresh' },
      connectProviders: [],
    });
    expect(JSON.stringify(res.body.meta.config.compat)).not.toMatch(/secret/i);
  });

  it('still answers the roles routes of the admin side', async () => {
    const res = await rqAdmin.get(ROLES);

    expect(res.status).toBe(200);
  });
});
