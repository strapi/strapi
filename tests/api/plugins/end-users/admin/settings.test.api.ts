import { createAuthRequest } from 'api-tests/request';
import { createUtils } from 'api-tests/utils';

import { createEndUsersInstance } from '../utils/create-end-users-instance';

const PASSWORD = 'Password123';
const SETTINGS = '/end-users/settings';

describe('end-users: admin settings API', () => {
  let strapi;
  let utils;
  let rqAdmin;
  let rqAuthor;
  let authorId: number;

  beforeAll(async () => {
    strapi = await createEndUsersInstance();
    utils = createUtils(strapi);

    rqAdmin = await createAuthRequest({ strapi });

    // An Author does not hold any of the end-users actions
    const [authorRole] = await utils.getRole({ code: 'strapi-author' });
    const author = await utils.createUser({
      email: 'end-users-settings-author@example.com',
      firstname: 'End users',
      lastname: 'Author',
      password: PASSWORD,
      isActive: true,
      roles: [authorRole.id],
    });

    authorId = author.id;
    rqAuthor = await createAuthRequest({
      strapi,
      userInfo: { email: 'end-users-settings-author@example.com', password: PASSWORD },
    });
  });

  afterAll(async () => {
    await utils.deleteUsersById([authorId]);
    await strapi.destroy();
  });

  it('PUT then GET round-trips, and the answer carries what the page draws from', async () => {
    const put = await rqAdmin.put(SETTINGS, {
      body: {
        redirects: { emailVerified: '/welcome' },
        passwords: { minLength: 12 },
        lockout: { maxAttempts: 7 },
      },
    });

    expect(put.status).toBe(200);
    expect(put.body.data.passwords.minLength).toBe(12);

    const get = await rqAdmin.get(SETTINGS);

    expect(get.status).toBe(200);
    expect(get.body.data.redirects.emailVerified).toBe('/welcome');
    expect(get.body.data.passwords).toEqual({
      minLength: 12,
      maxLength: 128,
      requireMixedClasses: false,
    });
    expect(get.body.data.lockout.maxAttempts).toBe(7);
    expect(get.body.meta.installedMethods).toContain('emailPassword');
    expect(typeof get.body.meta.breachedCheckInstalled).toBe('boolean');
    expect(get.body.meta.config.secret).toEqual({
      set: expect.any(Boolean),
      tooShort: expect.any(Boolean),
    });
  });

  it('gives an Author 403 on both routes', async () => {
    expect((await rqAuthor.get(SETTINGS)).status).toBe(403);
    expect((await rqAuthor.put(SETTINGS, { body: { passwords: { minLength: 9 } } })).status).toBe(
      403
    );
  });

  it('refuses an untrusted redirect with a 400 that names redirects.emailVerified', async () => {
    const res = await rqAdmin.put(SETTINGS, {
      body: { redirects: { emailVerified: 'https://evil.example.com/landing' } },
    });

    expect(res.status).toBe(400);
    expect(res.body.error.details.errors[0].path).toEqual(['redirects', 'emailVerified']);
  });
});
