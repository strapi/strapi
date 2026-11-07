/**
 * The HTTP contract of one end user's security, `/end-users/users/:documentId/...`: the sessions, the ban, the two-factor reset, and who may do them. A new file because no
 * admin file here is about a user.
 */
import { createAuthRequest, createRequest } from 'api-tests/request';
import { createUtils } from 'api-tests/utils';
import { contentTypes as contentTypesUtils } from '@strapi/utils';

import { createEndUsersInstance } from '../utils/create-end-users-instance';
import {
  ENGINE_UIDS,
  PROFILE_UID,
  TEST_ORIGIN,
  TEST_PASSWORD as PASSWORD,
  bearer,
  emptyTables,
  resetRoles,
} from '../utils/permissions';
import { totpFromUri } from '../utils/totp';

const USER_UID = 'plugin::end-users.user';
const TWO_FACTOR_UID = 'plugin::end-users.two-factor';
const READ = 'plugin::content-manager.explorer.read';
const FROM_FRONT_END = { Origin: TEST_ORIGIN };
const AUTHOR_PASSWORD = 'Password123';

describe('end-users: admin user security API', () => {
  let strapi;
  let utils;
  let rqAdmin;
  let rqReader;
  let rq;
  let readerRoleId: number;
  let readerId: number;
  let emails = 0;

  const base = (documentId: string) => `/end-users/users/${documentId}`;

  const signIn = (email: string, headers: Record<string, string> = {}) =>
    rq.post('/api/auth/sign-in/email', { body: { email, password: PASSWORD }, headers });

  const signedUp = async () => {
    emails += 1;

    const email = `security-${emails}@example.com`;
    const res = await rq.post('/api/auth/sign-up/email', {
      body: { email, password: PASSWORD, name: 'Test' },
      headers: FROM_FRONT_END,
    });

    expect(res.statusCode).toBe(200);

    return { email, documentId: res.body.user.id as string, token: res.headers['set-auth-token'] };
  };

  beforeAll(async () => {
    strapi = await createEndUsersInstance({ pluginConfig: { trustedOrigins: [TEST_ORIGIN] } });
    utils = createUtils(strapi);
    rq = createRequest({ strapi });
    rqAdmin = await createAuthRequest({ strapi });

    await emptyTables(strapi, [PROFILE_UID, ...ENGINE_UIDS]);
    await resetRoles(strapi);

    // An admin who may read end users in the Content Manager, and nothing more
    const role = await utils.createRole({ name: 'end-users-security-reader' });

    readerRoleId = role.id;
    await utils.assignPermissionsToRole(role.id, [
      // Every field a permission can name: the security of a user is refused to an admin who may
      // read only some of them
      {
        action: READ,
        subject: USER_UID,
        conditions: [],
        properties: {
          fields: contentTypesUtils.getVisibleAttributes(strapi.contentTypes[USER_UID]),
        },
      },
    ]);

    const reader = await utils.createUser({
      email: 'end-users-security-reader@example.com',
      firstname: 'End users',
      lastname: 'Reader',
      password: AUTHOR_PASSWORD,
      isActive: true,
      roles: [role.id],
    });

    readerId = reader.id;
    rqReader = await createAuthRequest({
      strapi,
      userInfo: { email: 'end-users-security-reader@example.com', password: AUTHOR_PASSWORD },
    });
  });

  afterAll(async () => {
    await utils.deleteUsersById([readerId]);
    await utils.deleteRolesById([readerRoleId]);
    await strapi.destroy();
  });

  it('lists the sessions without their token, and revokes one', async () => {
    const { email, documentId } = await signedUp();

    await signIn(email);
    await signIn(email);

    const listed = await rqAdmin.get(`${base(documentId)}/security`);

    expect(listed.status).toBe(200);
    expect(listed.body.data.sessions.length).toBeGreaterThanOrEqual(2);
    expect(listed.body.data.accounts).toEqual([
      expect.objectContaining({ providerId: 'credential' }),
    ]);
    expect(listed.body.data.status.banned).toBe(false);

    for (const session of listed.body.data.sessions) {
      expect(Object.keys(session).sort()).toEqual(
        ['createdAt', 'expiresAt', 'id', 'ipAddress', 'userAgent'].sort()
      );
    }

    const [first] = listed.body.data.sessions;
    const revoked = await rqAdmin.delete(`${base(documentId)}/sessions/${first.id}`);

    expect(revoked.status).toBe(200);

    const after = await rqAdmin.get(`${base(documentId)}/security`);

    expect(after.body.data.sessions.map(({ id }) => id)).not.toContain(first.id);
    expect(after.body.data.sessions).toHaveLength(listed.body.data.sessions.length - 1);

    // A session id that is not the user's is not found
    expect((await rqAdmin.delete(`${base(documentId)}/sessions/${first.id}`)).status).toBe(404);
  });

  it('a ban refuses the next Content API call with USER_BANNED and drops the sessions; unban lets the user back in', async () => {
    const { email, documentId, token } = await signedUp();

    expect((await rq.get('/api/users/me', { headers: bearer(token) })).statusCode).toBe(200);

    const banned = await rqAdmin.post(`${base(documentId)}/ban`, { body: { reason: 'spam' } });

    expect(banned.status).toBe(200);

    const refused = await rq.get('/api/users/me', { headers: bearer(token) });

    // The ban ends the sessions in the same transaction, so the token no longer names one: a 401
    // (the Content API strategy answers 403 USER_BANNED only for a session that outlived a ban)
    expect(refused.statusCode).toBe(401);

    const security = await rqAdmin.get(`${base(documentId)}/security`);

    expect(security.body.data.sessions).toEqual([]);
    expect(security.body.data.status).toMatchObject({ banned: true, banReason: 'spam' });

    expect((await signIn(email)).statusCode).toBe(403);

    expect((await rqAdmin.post(`${base(documentId)}/unban`)).status).toBe(200);
    expect((await signIn(email)).statusCode).toBe(200);
  });

  it('a reset turns two-factor off and clears the record; a backup code signs in once', async () => {
    const { email, documentId } = await signedUp();
    const first = await signIn(email);
    const cookie = first.headers['set-cookie'].map((line: string) => line.split(';')[0]).join('; ');
    const enabled = await rq.post('/api/auth/two-factor/enable', {
      body: { password: PASSWORD },
      headers: { cookie, ...FROM_FRONT_END },
    });

    expect(enabled.statusCode).toBe(200);
    expect(
      (
        await rq.post('/api/auth/two-factor/verify-totp', {
          body: { code: totpFromUri(enabled.body.totpURI) },
          headers: { cookie, ...FROM_FRONT_END },
        })
      ).statusCode
    ).toBe(200);

    const [backupCode] = enabled.body.backupCodes as string[];
    const viaBackupCode = async () => {
      const challenge = await signIn(email);
      const twoFactorCookie = challenge.headers['set-cookie']
        .map((line: string) => line.split(';')[0])
        .join('; ');

      return rq.post('/api/auth/two-factor/verify-backup-code', {
        body: { code: backupCode },
        headers: { cookie: twoFactorCookie, ...FROM_FRONT_END },
      });
    };

    expect((await viaBackupCode()).statusCode).toBe(200);
    expect((await viaBackupCode()).statusCode).not.toBe(200);

    expect((await rqAdmin.get(`${base(documentId)}/security`)).body.data.twoFactor).toBe(true);

    expect((await rqAdmin.post(`${base(documentId)}/two-factor/reset`)).status).toBe(200);

    const reset = await rqAdmin.get(`${base(documentId)}/security`);

    expect(reset.body.data.twoFactor).toBe(false);
    expect(await strapi.db.query(TWO_FACTOR_UID).count({ where: { userId: documentId } })).toBe(0);

    // No second factor to ask for any more
    const signedIn = await signIn(email);

    expect(signedIn.statusCode).toBe(200);
    expect(signedIn.body.twoFactorRedirect).toBeUndefined();
  });

  it('refuses unlinking the last account', async () => {
    const { documentId } = await signedUp();
    const { accounts } = (await rqAdmin.get(`${base(documentId)}/security`)).body.data;

    const res = await rqAdmin.delete(`${base(documentId)}/accounts/${accounts[0].id}`);

    expect(res.status).toBe(400);
  });

  it('answers the effective permissions in the shape of permissions/me', async () => {
    const { documentId } = await signedUp();
    const res = await rqAdmin.get(`${base(documentId)}/effective-permissions`);

    expect(res.status).toBe(200);
    expect(res.body.data.roles).toEqual([expect.objectContaining({ type: 'authenticated' })]);
    expect(res.body.data).toEqual(
      expect.objectContaining({ routes: expect.any(Array), subjects: expect.any(Object) })
    );
  });

  it('an admin with explorer.read but not explorer.update reads, and is refused every change with 403', async () => {
    const { documentId } = await signedUp();

    expect((await rqReader.get(`${base(documentId)}/security`)).status).toBe(200);

    for (const [method, path] of [
      ['post', '/ban'],
      ['post', '/unban'],
      ['post', '/unlock'],
      ['post', '/two-factor/reset'],
      ['post', '/send-password-reset'],
      ['delete', '/sessions'],
    ]) {
      // eslint-disable-next-line no-await-in-loop
      expect((await rqReader[method](`${base(documentId)}${path}`)).status).toBe(403);
    }

    // And the user was not banned by any of it
    expect((await rqAdmin.get(`${base(documentId)}/security`)).body.data.status.banned).toBe(false);
  });

  it('answers 404 for a user that does not exist', async () => {
    expect((await rqAdmin.get(`${base('nope')}/security`)).status).toBe(404);
  });
});
