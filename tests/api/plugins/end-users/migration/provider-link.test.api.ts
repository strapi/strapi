/**
 * Users who signed up under Users & Permissions with a provider that never says an address is
 * verified (Facebook, VK and others) have no account row after the move: Users & Permissions never
 * stored the provider's account id, and Better Auth links such a provider to an existing account
 * only when it is trusted. The migration records a pending link instead, which their first sign-in
 * with that provider spends, once, while the compatibility mode is on.
 *
 * Over the whole stack. Facebook is Better Auth's own provider, with the Graph API it calls answered
 * by the test (`withMockedFetch`); Keycloak is a generic OpenID Connect provider, against a fake
 * issuer. The sign-ins go through `/api/connect/:provider`, as a front end written for Users &
 * Permissions does.
 */
import { createAuthRequest, createRequest } from 'api-tests/request';
import { createMockResponse, withMockedFetch } from 'api-tests/mock-fetch';
import type { Core } from '@strapi/types';

import { pendingLinkIdentifier } from '../../../../../packages/plugins/end-users/server/src/utils/pending-link';
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
const VERIFICATION_UID = 'plugin::end-users.verification';
const PROVIDERS = '/end-users/providers';
// Built at run time: no secret-shaped literal in the source
const CLIENT_SECRET = ['fake', 'client', 'secret', 'value'].join('-');
const FACEBOOK_APP = 'facebook-app-id';
const PENDING = 'migrated-provider-link:%';

/**
 * Who signed up with Facebook under Users & Permissions. Erin and frank are confirmed; dave was
 * blocked and bob never confirmed his address. Alice used Keycloak, carol stays a GitHub user.
 */
const FACEBOOK_USERS: FixtureUser[] = ['erin', 'frank', 'dave', 'bob'];

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

const json = (body: unknown) =>
  createMockResponse({
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

/** The Graph API, as Facebook answers this app for the user whose profile is given */
const graphApi = (profile: Record<string, unknown>) => (url: string) => {
  if (url.startsWith('https://graph.facebook.com/v24.0/oauth/access_token')) {
    return json({ access_token: 'facebook-access', token_type: 'bearer', expires_in: 3600 });
  }

  if (url.startsWith('https://graph.facebook.com/debug_token')) {
    return json({ data: { is_valid: true, app_id: FACEBOOK_APP, user_id: profile.id } });
  }

  if (url.startsWith('https://graph.facebook.com/me')) {
    return json({ ...profile, picture: { data: { url: 'https://example.com/picture.png' } } });
  }

  return undefined;
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

  /**
   * A browser signing in with Facebook through `/api/connect/facebook`, to the response of the
   * connect callback. Facebook's own pages are skipped: the browser comes back with a code at once.
   */
  const signInWithFacebook = async (profile: Record<string, unknown>) => {
    const start = await rq.get('/api/connect/facebook');

    expect(start.status).toBe(302);

    const authorize = new URL(start.headers.location as string);
    const back = new URL(authorize.searchParams.get('redirect_uri') as string);

    back.searchParams.set('code', 'facebook-code');
    back.searchParams.set('state', authorize.searchParams.get('state') as string);

    let callback: Res | undefined;

    await withMockedFetch(graphApi(profile), async () => {
      callback = await rq.get(`${back.pathname}${back.search}`, {
        headers: { cookie: cookiesOf(start) },
      });
    });

    return callback as Res;
  };

  /** The same through the fake issuer that stands in for Keycloak */
  const signInWithKeycloak = async (user: { sub: string; email: string; name: string }) => {
    // No `email_verified`: the claim is not sent at all
    oidc.user = user as FakeOidcUser;

    const start = await rq.get('/api/connect/keycloak');

    expect(start.status).toBe(302);

    const authorize = await fetch(start.headers.location as string, { redirect: 'manual' });
    const back = new URL(authorize.headers.get('location') as string);

    return rq.get(`${back.pathname}${back.search}`, {
      headers: { cookie: cookiesOf(start) },
    }) as Res;
  };

  const expectRefused = (callback: Res) => {
    expect(callback.status).toBe(302);
    expect(errorOf(callback)).toBe('account_not_linked');
    expect(hasSession(callback)).toBe(false);
  };

  const expectSignedIn = (callback: Res) => {
    expect(callback.status).toBe(302);
    expect(errorOf(callback)).toBeNull();
    expect(hasSession(callback)).toBe(true);
  };

  const stop = async () => {
    await strapi?.destroy();
    strapi = undefined;
  };

  beforeAll(async () => {
    await resetDatabase();
    project = await seedUsersPermissionsProject();

    await inspectDatabase(async (db) => {
      await db('up_users')
        .whereIn(
          'id',
          FACEBOOK_USERS.map((key) => project.users[key].id)
        )
        .update({ provider: 'facebook' });
      await db('up_users').where('id', project.users.alice.id).update({ provider: 'keycloak' });
    });

    oidc = await startFakeOidc();
    strapi = await migratedInstance(project, { instance: { fakeOidc: oidc } });
    rq = createRequest({ strapi });
    rqAdmin = await createAuthRequest({ strapi });

    // The providers as an administrator sets them up after the move
    const facebook = await rqAdmin.put(`${PROVIDERS}/facebook`, {
      body: { enabled: true, clientId: FACEBOOK_APP, clientSecret: CLIENT_SECRET },
    });

    expect(facebook.status).toBe(200);
    expect(facebook.body.data).toMatchObject({ status: 'ready', trustForLinking: false });

    const keycloak = await rqAdmin.put(`${PROVIDERS}/keycloak`, {
      body: {
        enabled: true,
        clientId: 'keycloak-client',
        clientSecret: CLIENT_SECRET,
        fields: { issuer: oidc.issuer },
      },
    });

    expect(keycloak.status).toBe(200);
  });

  afterAll(async () => {
    await stop();
    await forgetMigration();
    removeProjectTypes();
    await resetDatabase();
  });

  it('records a pending link only for confirmed, unblocked users of a provider that never verifies an address', async () => {
    expect(await pendingLinks('erin')).toBe(1);
    expect(await pendingLinks('frank')).toBe(1);

    // Blocked, unconfirmed, a generic provider, and a provider that says what it verified
    for (const key of ['dave', 'bob', 'alice', 'carol'] as const) {
      // eslint-disable-next-line no-await-in-loop
      expect({ key, links: await pendingLinks(key) }).toEqual({ key, links: 0 });
    }

    expect(await pendingLinks()).toBe(2);

    for (const key of [...FACEBOOK_USERS, 'alice' as const, 'carol' as const]) {
      // eslint-disable-next-line no-await-in-loop
      expect(await accountsOf(key)).toBe(0);
    }

    const { body } = await rqAdmin.get('/end-users/migration');
    const item = body.data.report.items.find(
      (entry: { kind: string }) => entry.kind === 'provider-pending-links'
    );

    expect(item).toMatchObject({ severity: 'info', count: 2, refs: ['facebook'] });
    // Ids and counts, never an address
    expect(JSON.stringify(item)).not.toContain('@');
  });

  it('links Facebook on the first sign-in with the recorded address, though Facebook never says it is verified', async () => {
    // The address in other capitals than the one stored
    const callback = await signInWithFacebook({
      id: 'fb-erin',
      name: 'Erin',
      email: 'Erin@Example.com',
    });

    expectSignedIn(callback);
    expect(
      await count(ACCOUNT_UID, {
        userId: documentIdOf('erin'),
        providerId: 'facebook',
        accountId: 'fb-erin',
      })
    ).toBe(1);
    expect(await sessionsOf('erin')).toBe(1);
    // The link is spent, and the user is the migrated one: no second user with the address
    expect(await pendingLinks('erin')).toBe(0);
    expect(await count(USER_UID, { email: 'erin@example.com' })).toBe(1);

    // From now on Facebook signs her in through the account the link made
    expectSignedIn(
      await signInWithFacebook({ id: 'fb-erin', name: 'Erin', email: 'erin@example.com' })
    );
  });

  it('links once: another Facebook account with that address is refused', async () => {
    expectRefused(
      await signInWithFacebook({ id: 'fb-someone', name: 'Not Erin', email: 'erin@example.com' })
    );
    expect(await count(ACCOUNT_UID, { accountId: 'fb-someone' })).toBe(0);
    expect(await accountsOf('erin')).toBe(1);
  });

  it('never overrules a provider that says the address is not verified', async () => {
    expectRefused(
      await signInWithFacebook({
        id: 'fb-frank',
        name: 'Frank',
        email: 'frank@example.com',
        email_verified: false,
      })
    );
    expect(await accountsOf('frank')).toBe(0);
    // Not spent by a sign-in that did not link
    expect(await pendingLinks('frank')).toBe(1);
  });

  it('refuses an address other than the one recorded', async () => {
    // Frank's address changed after the move; the link holds the one he had then
    await strapi!.db.query(USER_UID).update({
      where: { documentId: documentIdOf('frank') },
      data: { email: 'frank.new@example.com' },
    });

    expectRefused(
      await signInWithFacebook({ id: 'fb-frank', name: 'Frank', email: 'frank.new@example.com' })
    );
    expect(await accountsOf('frank')).toBe(0);
    expect(await sessionsOf('frank')).toBe(0);
  });

  it('never spends a link through a generic OpenID Connect provider, or through another provider', async () => {
    // No migration records a link for a generic provider: this one is written by hand
    await strapi!.db.query(VERIFICATION_UID).create({
      data: {
        identifier: pendingLinkIdentifier('keycloak', 'alice@example.com'),
        value: documentIdOf('alice'),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    expectRefused(
      await signInWithKeycloak({ sub: 'kc-alice', email: 'alice@example.com', name: 'Alice' })
    );
    // Facebook never verifies an address either, but the link is Keycloak's
    expectRefused(
      await signInWithFacebook({ id: 'fb-alice', name: 'Alice', email: 'alice@example.com' })
    );
    expect(await accountsOf('alice')).toBe(0);
    expect(await pendingLinks('alice')).toBe(1);
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

    expectRefused(await signInWithFacebook({ id: 'fb-nm', name: 'NM', email }));
    expect(await count(ACCOUNT_UID, { userId: user.documentId })).toBe(1);
    expect(await count(SESSION_UID, { userId: user.documentId })).toBe(0);
  });

  it('gives no link to a user who was blocked or never confirmed their address, and no session', async () => {
    expectRefused(
      await signInWithFacebook({ id: 'fb-dave', name: 'Dave', email: 'dave@example.com' })
    );
    expectRefused(
      await signInWithFacebook({ id: 'fb-bob', name: 'Bob', email: 'bob@example.com' })
    );

    for (const key of ['dave', 'bob'] as const) {
      // eslint-disable-next-line no-await-in-loop
      expect(await accountsOf(key)).toBe(0);
      // eslint-disable-next-line no-await-in-loop
      expect(await sessionsOf(key)).toBe(0);
    }
  });

  it('drops the pending links on a rollback, and takes a user linked through one back with that provider', async () => {
    await stop();

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
              (['erin', 'frank', 'alice'] as const).map((key) => project.users[key].id)
            )
            .select('id', 'provider')
        ).map((row) => [row.id, row.provider])
      ),
    }));

    expect(after.pending).toBe(0);
    // Linked through the pending link: the account is her first, so it names the provider. Frank
    // and alice were never linked and keep the provider they had
    expect(after.providers).toEqual({
      [project.users.erin.id]: 'facebook',
      [project.users.frank.id]: 'facebook',
      [project.users.alice.id]: 'keycloak',
    });
  });

  it('drops the pending links when compatibility mode is turned off and the cleanup runs', async () => {
    // A second migration records them again
    strapi = await migratedInstance(project);
    expect(await pendingLinks()).toBeGreaterThan(0);
    await stop();

    strapi = await migratedInstance(project, {
      instance: { pluginConfig: { compat: { usersPermissions: false } } },
    });

    const record = await inspectDatabase((db) =>
      db('strapi_core_store_settings').where('key', 'plugin_end-users_migration').first('value')
    );

    expect(JSON.parse(record.value).cleanedUpAt).toEqual(expect.any(String));
    expect(await pendingLinks()).toBe(0);
  });
});
