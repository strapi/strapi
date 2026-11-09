/**
 * `/api/users*` in the shapes Users & Permissions answered with, over the whole stack, while the
 * compatibility mode is on: a bare list, numeric ids next to the `documentId`s, the profile merged
 * into the user, and a `role` only where one is asked for.
 */
import { createAuthRequest, createRequest } from 'api-tests/request';

import { createEndUsersInstance } from '../utils/create-end-users-instance';
import { compatConfig, seedUpUser } from '../utils/compat';
import { createFixtureBuilder, NOTE_UID } from '../utils/fixtures';
import { DEFAULT_AUTHENTICATED_PERMISSIONS } from '../../../../../packages/plugins/end-users/server/src/bootstrap';
import {
  ENGINE_UIDS,
  PROFILE_UID,
  TEST_ORIGIN,
  bearer,
  createSignedInUser,
  emptyTables,
  resetRoles,
  setRolePermissions,
  unconditioned,
} from '../utils/permissions';

const SETTINGS = '/end-users/settings';
const ROLES = '/end-users/roles';
const USER_UID = 'plugin::end-users.user';
const ALL_USER_ACTIONS = ['find', 'findOne', 'create', 'update', 'delete', 'count'];

describe('end-users compat: users', () => {
  let strapi;
  let rq;
  let rqAdmin;

  /** Authenticated keeps its defaults and is granted these actions on the user type. */
  const grant = (actions: string[], extra: ReturnType<typeof unconditioned>[] = []) =>
    setRolePermissions(strapi, 'authenticated', [
      ...DEFAULT_AUTHENTICATED_PERMISSIONS,
      ...actions.map((action) => unconditioned(`${USER_UID}.${action}`, USER_UID)),
      ...extra,
    ]);

  /** Signs a user up and gives the headers that act as them. */
  const signUp = async (email: string) => {
    const { token, documentId } = await createSignedInUser(rq, email);

    return { documentId, headers: bearer(token) };
  };

  const numericIdOf = async (documentId: string) =>
    (await strapi.db.query(USER_UID).findOne({ where: { documentId } })).id as number;

  beforeAll(async () => {
    strapi = await createEndUsersInstance({
      pluginConfig: { ...compatConfig(), trustedOrigins: [TEST_ORIGIN] },
      // `api::note.note`, whose `owner` is a relation to the user
      builder: createFixtureBuilder(),
      profileAttributes: { company: { type: 'string' } },
    });
    rq = createRequest({ strapi });
    rqAdmin = await createAuthRequest({ strapi });

    await strapi
      .plugin('end-users')
      .service('settings')
      .set({
        methods: { emailPassword: true, username: true },
        signUp: { enabled: true, requireEmailVerification: false, registrationFields: [] },
      });
  });

  beforeEach(async () => {
    await emptyTables(strapi, [NOTE_UID, PROFILE_UID, ...ENGINE_UIDS]);
    await resetRoles(strapi);
  });

  afterAll(async () => {
    await emptyTables(strapi, [NOTE_UID, PROFILE_UID, ...ENGINE_UIDS]);
    await resetRoles(strapi);
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

  it('lists users as a bare array with numeric id and documentId and strips private fields', async () => {
    const caller = await signUp('lister@example.com');
    const seeded = await seedUpUser(strapi, { email: 'other@example.com', username: 'other' });

    await grant(['find']);

    const res = await rq.get('/api/users', { headers: caller.headers });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);

    const other = res.body.find((user) => user.email === 'other@example.com');

    expect(other).toMatchObject({
      id: seeded.id,
      documentId: seeded.documentId,
      username: 'other',
      provider: 'local',
      confirmed: true,
      blocked: false,
    });

    for (const user of res.body) {
      for (const field of ['password', 'roles', 'emailVerified', 'banned', 'twoFactorEnabled']) {
        expect(user).not.toHaveProperty(field);
      }
    }
  });

  it('answers a bare number on /users/count', async () => {
    const caller = await signUp('counter@example.com');

    await seedUpUser(strapi, { email: 'counted@example.com' });
    await grant(['count']);

    const res = await rq.get('/api/users/count', { headers: caller.headers });

    expect(res.status).toBe(200);
    expect(res.body).toBe(2);
  });

  it('a role without the count action gets 403 on /users/count', async () => {
    const caller = await signUp('nocount@example.com');

    await grant(ALL_USER_ACTIONS.filter((action) => action !== 'count'));

    const res = await rq.get('/api/users/count', { headers: caller.headers });

    expect(res.status).toBe(403);
  });

  it('shows role only with populate=role on /users/me, as { id, name, description, type }', async () => {
    const caller = await signUp('me@example.com');

    const plain = await rq.get('/api/users/me', { headers: caller.headers });
    const populated = await rq.get('/api/users/me?populate=role', { headers: caller.headers });

    expect(plain.status).toBe(200);
    expect(plain.body).toMatchObject({ documentId: caller.documentId, email: 'me@example.com' });
    expect(plain.body).not.toHaveProperty('role');
    expect(populated.status).toBe(200);
    expect(Object.keys(populated.body.role).sort()).toEqual(['description', 'id', 'name', 'type']);
    expect(populated.body.role).toMatchObject({ name: 'Authenticated', type: 'authenticated' });
  });

  it('drops populate=role on /users for a caller the field rules do not let read roles', async () => {
    const caller = await signUp('byrole@example.com');

    await grant(['find']);

    const res = await rq.get('/api/users?populate=role', { headers: caller.headers });

    expect(res.status).toBe(200);
    expect(res.body[0]).not.toHaveProperty('role');
  });

  it('merges profile fields into the user and writes them to the profile', async () => {
    const caller = await signUp('profiled@example.com');

    await grant(['findOne', 'update']);

    const updated = await rq.put(`/api/users/${caller.documentId}`, {
      headers: caller.headers,
      body: { company: 'Acme' },
    });

    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ documentId: caller.documentId, company: 'Acme' });

    const read = await rq.get(`/api/users/${caller.documentId}`, { headers: caller.headers });

    expect(read.body.company).toBe('Acme');

    const profile = await strapi.db.query(PROFILE_UID).findOne({
      where: { user: { documentId: caller.documentId } },
    });

    expect(profile.company).toBe('Acme');
  });

  it('resolves a numeric id and a documentId to the same user', async () => {
    const caller = await signUp('twice@example.com');

    await grant(['findOne']);

    const id = await numericIdOf(caller.documentId);
    const byId = await rq.get(`/api/users/${id}`, { headers: caller.headers });
    const byDocumentId = await rq.get(`/api/users/${caller.documentId}`, {
      headers: caller.headers,
    });

    expect(byId.status).toBe(200);
    expect(byId.body).toEqual(byDocumentId.body);
    expect(byId.body).toMatchObject({ id, documentId: caller.documentId });
  });

  it('creates a user with 201 and a bare user, and deletes it returning the user', async () => {
    const caller = await signUp('creator@example.com');

    await grant(['create', 'findOne', 'delete']);

    const created = await rq.post('/api/users', {
      headers: caller.headers,
      body: { email: 'Made@Example.com', username: 'made', password: 'Passw0rd!long' },
    });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      email: 'made@example.com',
      username: 'made',
      provider: 'local',
    });
    expect(created.body).not.toHaveProperty('data');

    const removed = await rq.delete(`/api/users/${created.body.id}`, { headers: caller.headers });

    expect(removed.status).toBe(200);
    expect(removed.body).toMatchObject({ documentId: created.body.documentId });

    const gone = await rq.get(`/api/users/${created.body.documentId}`, {
      headers: caller.headers,
    });

    expect(gone.status).toBe(404);
  });

  it('refuses role, confirmed, blocked and provider in a write, naming the field', async () => {
    const caller = await signUp('refuser@example.com');

    await grant(['update']);

    for (const field of ['role', 'confirmed', 'blocked', 'provider']) {
      // eslint-disable-next-line no-await-in-loop
      const res = await rq.put(`/api/users/${caller.documentId}`, {
        headers: caller.headers,
        body: { [field]: field === 'provider' ? 'github' : 1 },
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain(field);
    }
  });

  it('answers 400 for populate of a former inverse relation field', async () => {
    const caller = await signUp('inverse@example.com');

    await grant(['find']);

    // `notes` was the other side of a note's `owner` on a user of users-permissions; the user type
    // holds no such attribute now
    const res = await rq.get('/api/users?populate=notes', { headers: caller.headers });

    expect(res.status).toBe(400);
  });

  it('a relation from an app type to the user resolves', async () => {
    const caller = await signUp('related@example.com');
    const note = await strapi.documents(NOTE_UID).create({
      data: { title: 'owned', owner: { connect: [{ documentId: caller.documentId }] } },
    });

    await grant(
      [],
      [
        unconditioned('api::note.note.findOne', NOTE_UID, { fields: ['title', 'owner'] }),
        unconditioned(`${USER_UID}.find`, USER_UID),
        unconditioned(`${USER_UID}.findOne`, USER_UID),
      ]
    );

    const res = await rq.get(`/api/notes/${note.documentId}?populate=owner`, {
      headers: caller.headers,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.owner).toMatchObject({ documentId: caller.documentId });
  });

  it('derives confirmed, blocked and provider from the stored fields', async () => {
    const caller = await signUp('deriver@example.com');
    const unconfirmed = await seedUpUser(strapi, {
      email: 'unconfirmed@example.com',
      confirmed: false,
    });
    const banned = await seedUpUser(strapi, { email: 'banned@example.com', blocked: true });
    const social = await seedUpUser(strapi, { email: 'social@example.com', credential: false });

    await strapi.db.query('plugin::end-users.account').create({
      data: {
        userId: social.documentId,
        providerId: 'github',
        accountId: 'github-account-1',
      },
    });
    await grant(['find']);

    const res = await rq.get('/api/users', { headers: caller.headers });
    const byEmail = (email: string) => res.body.find((user) => user.email === email);

    expect(byEmail(unconfirmed.email)).toMatchObject({ confirmed: false, blocked: false });
    expect(byEmail(banned.email)).toMatchObject({ confirmed: true, blocked: true });
    expect(byEmail(social.email)).toMatchObject({ provider: 'github' });
    expect(byEmail('deriver@example.com')).toMatchObject({ provider: 'local' });
  });

  it('answers 404 on /api/users-permissions/roles and /permissions', async () => {
    const caller = await signUp('absent@example.com');

    for (const path of ['/api/users-permissions/roles', '/api/users-permissions/permissions']) {
      // eslint-disable-next-line no-await-in-loop
      const res = await rq.get(path, { headers: caller.headers });

      expect(res.status).toBe(404);
    }
  });

  it('answers 404 for a missing user', async () => {
    const caller = await signUp('missing@example.com');

    await grant(['findOne', 'update', 'delete']);

    const missing = await numericIdOf(caller.documentId).then((id) => id + 1000);
    const read = await rq.get(`/api/users/${missing}`, { headers: caller.headers });
    const write = await rq.put(`/api/users/${missing}`, {
      headers: caller.headers,
      body: { username: 'nobody' },
    });
    const remove = await rq.delete(`/api/users/${missing}`, { headers: caller.headers });

    expect(read.status).toBe(404);
    expect(write.status).toBe(404);
    expect(remove.status).toBe(404);
  });
});
