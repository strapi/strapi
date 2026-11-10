/**
 * Users who signed up with a provider under Users & Permissions have no account row after the
 * move: Users & Permissions never stored the provider's account id. A provider that does not say
 * the address is verified (Facebook, X, VK and others) would then never be linked to their account,
 * so the migration records a pending link that their first sign-in with that provider spends.
 *
 * Over the whole stack, against a fake OpenID Connect issuer that stands in for Keycloak (a
 * provider Users & Permissions had, which keeps its id) and for a second provider. The sign-ins go
 * through `/api/connect/:provider`, as a front end written for Users & Permissions does.
 */
import { createAuthRequest, createRequest } from 'api-tests/request';
import type { Core } from '@strapi/types';

import { startFakeOidc } from '../utils/fake-oidc';
import type { FakeOidc, FakeOidcUser } from '../utils/fake-oidc';
import { TEST_PASSWORD } from '../utils/permissions';
import { resetDatabase } from '../utils/reset-database';
import {
  forgetMigration,
  inspectDatabase,
  migratedInstance,
  removeProjectTypes,
  seedUsersPermissionsProject,
} from '../utils/users-permissions-project';
import type { FixtureUser, UsersPermissionsProject } from '../utils/users-permissions-project';

const USER_UID = 'plugin::end-users.user';
const ACCOUNT_UID = 'plugin::end-users.account';
const SESSION_UID = 'plugin::end-users.session';
const PROVIDERS = '/end-users/providers';
const CLIENT_SECRET = 'fake-client-secret-value';
const PENDING = 'migrated-provider-link:%';

/** Users who signed up with Keycloak under Users & Permissions, each for one of the cases below */
const KEYCLOAK_USERS: FixtureUser[] = ['erin', 'frank', 'alice', 'dave', 'bob'];

type Res = Awaited<ReturnType<ReturnType<typeof createRequest>['get']>>;

/** The cookies of a response, as a client sends them back */
const cookiesOf = (res: Res) =>
  ((res.headers['set-cookie'] ?? []) as unknown as string[])
    .map((cookie) => cookie.split(';')[0])
    .join('; ');

const hasSession = (res: Res) => /strapi\.session_token=[^;]/.test(cookiesOf(res));

/** What the connect callback sends the front end when the sign-in failed, or `null` */
const errorOf = (res: Res): string | null => {
  const url = new URL(res.headers.location as string);

  return url.searchParams.get('error_description') ?? url.searchParams.get('error');
};

describe('migration from users-permissions: provider users are linked on their first sign-in', () => {
  let project: UsersPermissionsProject;
  let strapi: Core.Strapi | undefined;
  let oidc: FakeOidc;
  let rq;
  let rqAdmin;

  const documentIdOf = (key: FixtureUser) => project.users[key].documentId;

  const count = (uid: string, where: Record<string, unknown>) =>
    strapi!.db.query(uid as never).count({ where });

  const accountsOf = (key: FixtureUser) => count(ACCOUNT_UID, { userId: documentIdOf(key) });

  const sessionsOf = (key: FixtureUser) => count(SESSION_UID, { userId: documentIdOf(key) });

  /** The pending links the database holds, for one user or for all of them */
  const pendingLinks = (key?: FixtureUser) =>
    inspectDatabase(async (db) => {
      const query = db('eu_verifications').where('identifier', 'like', PENDING);
      const row = await (key ? query.where('value', documentIdOf(key)) : query)
        .count({ c: '*' })
        .first();

      return Number(row?.c);
    });

  /** A browser signing in through `/api/connect/:provider`, as the issuer's user, to the callback */
  const signInWith = async (
    provider: string,
    user: { sub: string; email: string; name: string; email_verified?: boolean }
  ) => {
    // Left out, the claim is not sent at all, as some providers never send it
    oidc.user = user as FakeOidcUser;

    const start = await rq.get(`/api/connect/${provider}`);

    expect(start.status).toBe(302);

    const authorize = await fetch(start.headers.location as string, { redirect: 'manual' });
    const back = new URL(authorize.headers.get('location') as string);

    return rq.get(`${back.pathname}${back.search}`, {
      headers: { cookie: cookiesOf(start) },
    }) as Res;
  };

  const expectRefused = (callback: Res, error = 'account_not_linked') => {
    expect(callback.status).toBe(302);
    expect(errorOf(callback)).toBe(error);
    expect(hasSession(callback)).toBe(false);
  };

  const expectSignedIn = (callback: Res) => {
    expect(callback.status).toBe(302);
    expect(errorOf(callback)).toBeNull();
    expect(hasSession(callback)).toBe(true);
  };

  beforeAll(async () => {
    await resetDatabase();
    project = await seedUsersPermissionsProject();

    // They signed up with Keycloak; carol stays a GitHub user
    await inspectDatabase((db) =>
      db('up_users')
        .whereIn(
          'id',
          KEYCLOAK_USERS.map((key) => project.users[key].id)
        )
        .update({ provider: 'keycloak' })
    );

    oidc = await startFakeOidc();
    strapi = await migratedInstance(project, { instance: { fakeOidc: oidc } });
    rq = createRequest({ strapi });
    rqAdmin = await createAuthRequest({ strapi });

    // The provider as an administrator sets it up after the move, and a second one
    const keycloak = await rqAdmin.put(`${PROVIDERS}/keycloak`, {
      body: {
        enabled: true,
        clientId: 'keycloak-client',
        clientSecret: CLIENT_SECRET,
        fields: { issuer: oidc.issuer },
      },
    });

    expect(keycloak.status).toBe(200);
    expect(keycloak.body.data).toMatchObject({ status: 'ready', trustForLinking: false });

    const other = await rqAdmin.post(PROVIDERS, {
      body: {
        id: 'other-idp',
        name: 'Other IdP',
        discoveryUrl: oidc.discoveryUrl,
        clientId: 'other-client',
        clientSecret: CLIENT_SECRET,
      },
    });

    expect(other.status).toBe(200);
  });

  afterAll(async () => {
    await strapi?.destroy();
    await forgetMigration();
    removeProjectTypes();
    await resetDatabase();
  });

  it('records a pending link for each provider user, with no account, and reports how many', async () => {
    // The five Keycloak users and carol
    expect(await pendingLinks()).toBe(KEYCLOAK_USERS.length + 1);

    for (const key of [...KEYCLOAK_USERS, 'carol' as const]) {
      // eslint-disable-next-line no-await-in-loop
      expect(await accountsOf(key)).toBe(0);
    }

    const { body } = await rqAdmin.get('/end-users/migration');
    const item = body.data.report.items.find(
      (entry: { kind: string }) => entry.kind === 'provider-pending-links'
    );

    expect(item).toMatchObject({
      severity: 'info',
      count: KEYCLOAK_USERS.length + 1,
      refs: expect.arrayContaining(['keycloak', 'github']),
    });
    // Ids and counts, never an address
    expect(JSON.stringify(item)).not.toContain('@');
  });

  it('links the provider on the first sign-in with the recorded address, though the provider never says it is verified', async () => {
    // No `email_verified` at all, and the address in other capitals than the one stored
    const callback = await signInWith('keycloak', {
      sub: 'erin-keycloak',
      email: 'Erin@Example.com',
      name: 'Erin',
    });

    expectSignedIn(callback);
    expect(
      await count(ACCOUNT_UID, {
        userId: documentIdOf('erin'),
        providerId: 'keycloak',
        accountId: 'erin-keycloak',
      })
    ).toBe(1);
    expect(await sessionsOf('erin')).toBe(1);
    // The link is spent, and the user is the migrated one: no second user with the address
    expect(await pendingLinks('erin')).toBe(0);
    expect(await count(USER_UID, { email: 'erin@example.com' })).toBe(1);

    // From now on the provider signs her in through the account the link made
    expectSignedIn(
      await signInWith('keycloak', { sub: 'erin-keycloak', email: 'erin@example.com', name: 'E' })
    );
  });

  it('links once: another account of the same provider with that address is refused', async () => {
    const callback = await signInWith('keycloak', {
      sub: 'someone-else',
      email: 'erin@example.com',
      name: 'Not Erin',
      email_verified: false,
    });

    expectRefused(callback);
    expect(await count(ACCOUNT_UID, { accountId: 'someone-else' })).toBe(0);
    expect(await accountsOf('erin')).toBe(1);
  });

  it('refuses another provider, and leaves the link for the provider it was recorded for', async () => {
    const callback = await signInWith('other-idp', {
      sub: 'alice-other',
      email: 'alice@example.com',
      name: 'Alice',
      email_verified: false,
    });

    expectRefused(callback);
    expect(await accountsOf('alice')).toBe(0);
    expect(await pendingLinks('alice')).toBe(1);

    // An explicit `false` from the provider it was recorded for is no different from no claim
    expectSignedIn(
      await signInWith('keycloak', {
        sub: 'alice-keycloak',
        email: 'alice@example.com',
        name: 'Alice',
        email_verified: false,
      })
    );
    expect(await pendingLinks('alice')).toBe(0);
  });

  it('refuses an address other than the one recorded', async () => {
    // Frank's address changed after the move; the link holds the one he had then
    await strapi!.db
      .query(USER_UID)
      .update({
        where: { documentId: documentIdOf('frank') },
        data: { email: 'frank.new@example.com' },
      });

    const callback = await signInWith('keycloak', {
      sub: 'frank-keycloak',
      email: 'frank.new@example.com',
      name: 'Frank',
    });

    expectRefused(callback);
    expect(await accountsOf('frank')).toBe(0);
    expect(await sessionsOf('frank')).toBe(0);
  });

  it('refuses a user who has no pending link, as before', async () => {
    const email = 'not-migrated@example.com';
    const user = await strapi!.documents(USER_UID).create({
      data: { email, name: 'Not migrated', emailVerified: true },
    });
    const engine = strapi!.plugin('end-users').service('engine').get();

    await strapi!.documents(ACCOUNT_UID).create({
      data: {
        userId: user.documentId,
        providerId: 'credential',
        accountId: user.documentId,
        password: await engine.hashPassword(TEST_PASSWORD),
      },
    });

    expectRefused(await signInWith('keycloak', { sub: 'nm-keycloak', email, name: 'NM' }));
    expect(await count(ACCOUNT_UID, { userId: user.documentId })).toBe(1);
    expect(await count(SESSION_UID, { userId: user.documentId })).toBe(0);
  });

  it('keeps refusing a migrated user whose own address was never confirmed', async () => {
    // Bob never confirmed his address under Users & Permissions
    expectRefused(
      await signInWith('keycloak', { sub: 'bob-keycloak', email: 'bob@example.com', name: 'Bob' })
    );
    expect(await accountsOf('bob')).toBe(0);
    // Not spent by a sign-in that did not link
    expect(await pendingLinks('bob')).toBe(1);
  });

  it('creates no session for a banned migrated user', async () => {
    // Dave was blocked under Users & Permissions
    const callback = await signInWith('keycloak', {
      sub: 'dave-keycloak',
      email: 'dave@example.com',
      name: 'Dave',
    });

    // Linked as a trusted provider would link him, and refused when the session is made
    expect(callback.status).toBe(302);
    // The ban's own message, which the connect callback passes on as the error description
    expect(errorOf(callback)).toMatch(/you have been banned/i);
    expect(hasSession(callback)).toBe(false);
    expect(await sessionsOf('dave')).toBe(0);
  });

  it('drops the pending links on a rollback, and takes a user linked through one back with that provider', async () => {
    await strapi!.destroy();
    strapi = undefined;

    await expect(migratedInstance(project, { migration: { rollback: true } })).rejects.toThrow(
      /migration\.rollback/
    );

    const after = await inspectDatabase(async (db) => ({
      pending: Number(
        (
          await db('eu_verifications')
            .where('identifier', 'like', PENDING)
            .count({ c: '*' })
            .first()
        )?.c
      ),
      providers: Object.fromEntries(
        (
          await db('up_users')
            .whereIn(
              'id',
              (['erin', 'alice', 'bob', 'carol'] as const).map((key) => project.users[key].id)
            )
            .select('id', 'provider')
        ).map((row) => [row.id, row.provider])
      ),
    }));

    expect(after.pending).toBe(0);
    // Linked through the pending link: the account is their first, so it names the provider. Bob
    // and carol were never linked and keep the provider they had
    expect(after.providers).toEqual({
      [project.users.erin.id]: 'keycloak',
      [project.users.alice.id]: 'keycloak',
      [project.users.bob.id]: 'keycloak',
      [project.users.carol.id]: 'github',
    });
  });
});
