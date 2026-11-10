/**
 * What the Content API does for an end user, over REST: who the strategy says the caller is, and the
 * rules of their role (fields, drafts, publish, owner, locked fields, writes against the stored
 * entry) applied end to end. The unit tests hold the logic of each rule; this file holds the proof
 * that a request through the whole stack gets what the rule says, with at least one case for each
 * thing a rule protects.
 *
 * One Strapi instance serves every describe below (each boot and each content type setup costs CI
 * time, in six jobs). Each describe starts from empty tables and from the roles it sets, so none
 * depends on another.
 */
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createAuthRequest, createContentAPIRequest, createRequest } from 'api-tests/request';
import { until } from '../utils/wait';
import {
  ARTICLE_UID,
  FOLDER_UID,
  NOTE_UID,
  ORGANIZATION_UID,
  TAG_UID,
  USER_UID,
  createFixtureBuilder,
  createFixturesInstance,
} from '../utils/fixtures';
import {
  ENGINE_UIDS,
  IS_OWNER,
  IS_SELF,
  PROFILE_UID,
  TEST_ORIGIN,
  TEST_PASSWORD,
  bearer,
  createSignedInUser,
  emptyTables,
  owned,
  resetRoles,
  row,
  setRolePermissions,
  unconditioned,
} from '../utils/permissions';
import { DEFAULT_AUTHENTICATED_PERMISSIONS } from '../../../../../packages/plugins/end-users/server/src/bootstrap';

const ROLE_UID = 'plugin::end-users.role';
const PERMISSION_UID = 'plugin::end-users.permission';
const SESSION_UID = 'plugin::end-users.session';
const SHELF_UID = 'api::shelf.shelf';
const HOMEPAGE_UID = 'api::homepage.homepage';
const BANNER_UID = 'api::banner.banner';
const BOARD_UID = 'api::board.board';
const POST_UID = 'api::post.post';
const TOKEN_NAME = 'end-users-permissions-test';
const HEADER = 'x-strapi-permissions-explain';
const FRENCH = 'fr';
const GERMAN = 'de';
const FOREIGN = 'https://evil.example.com';
const DAY = 24 * 60 * 60 * 1000;

/**
 * `api::shelf.shelf`: without draft & publish. Its `articles` link to both versions of an article
 * (the Document Service links a type without draft & publish to the draft and the published one).
 */
const shelfModel = {
  kind: 'collectionType',
  singularName: 'shelf',
  pluralName: 'shelves',
  displayName: 'Shelf',
  draftAndPublish: false,
  attributes: {
    name: { type: 'string' },
    articles: { type: 'relation', relation: 'oneToMany', target: ARTICLE_UID },
  },
};

/**
 * `api::homepage.homepage`: a single type with draft & publish. Its `tags` have draft & publish;
 * its `shelf` does not, and the shelf's articles do.
 */
const homepageModel = {
  kind: 'singleType',
  singularName: 'homepage',
  pluralName: 'homepages',
  displayName: 'Homepage',
  draftAndPublish: true,
  attributes: {
    title: { type: 'string' },
    tags: { type: 'relation', relation: 'oneToMany', target: TAG_UID },
    shelf: { type: 'relation', relation: 'oneToOne', target: SHELF_UID },
  },
};

/** `api::banner.banner`: a single type with draft & publish, owned through a one-way relation */
const bannerModel = {
  kind: 'singleType',
  singularName: 'banner',
  pluralName: 'banners',
  displayName: 'Banner',
  draftAndPublish: true,
  attributes: {
    title: { type: 'string' },
    owner: { type: 'relation', relation: 'oneToOne', target: USER_UID },
  },
};

/** `api::board.board`: a single type without draft & publish, owned the same way */
const boardModel = {
  kind: 'singleType',
  singularName: 'board',
  pluralName: 'boards',
  displayName: 'Board',
  draftAndPublish: false,
  attributes: {
    title: { type: 'string' },
    owner: { type: 'relation', relation: 'oneToOne', target: USER_UID },
  },
};

/**
 * `api::post.post`: localized, without draft & publish. Its `owner` is a one-way relation to the end
 * user, and is not localized: the entries of the tests set it per locale straight through the
 * Document Service, which does not copy it between locales on a create.
 */
const postModel = {
  kind: 'collectionType',
  singularName: 'post',
  pluralName: 'posts',
  displayName: 'Post',
  draftAndPublish: false,
  pluginOptions: { i18n: { localized: true } },
  attributes: {
    title: { type: 'string', pluginOptions: { i18n: { localized: true } } },
    owner: { type: 'relation', relation: 'oneToOne', target: USER_UID },
  },
};

/** A static condition on the entry's own data: what a write must leave behind to be allowed */
const TITLE_STARTS_OK = {
  name: 'api::title-starts-ok',
  displayName: 'Title starts with ok',
  subjects: [ARTICLE_UID],
  query: { title: { $startsWith: 'ok' } },
};

/** A condition on the data of the caller's own profile: what an update of it must leave behind */
const OWN_PROFILE_NICKNAME_OK = {
  name: 'api::own-profile-nickname-ok',
  displayName: 'Own profile, nickname starts with ok',
  subjects: [PROFILE_UID],
  query: {
    user: { documentId: { $eq: '$user.documentId' } },
    nickname: { $startsWith: 'ok' },
  },
};

/** A code condition on a profile placeholder: the user sees the entries of their organization */
const IN_MY_ORGANIZATION = {
  name: 'api::in-my-organization',
  displayName: 'In my organization',
  subjects: [ARTICLE_UID],
  query: { organization: { documentId: { $eq: '$profile.organization.documentId' } } },
};

/** What `ctx.notFound()` sends, and what a document that doesn't exist gets */
const NOT_FOUND = {
  data: null,
  error: { status: 404, name: 'NotFoundError', message: 'Not Found', details: {} },
};

/** The drafts gate's refusal, as a REST client sees it */
const draftsForbidden = (uid: string) => ({
  data: null,
  error: {
    status: 403,
    name: 'PolicyError',
    message: 'Reading drafts is not allowed',
    details: { code: 'DRAFT_READ_FORBIDDEN', uid },
  },
});

describe('end-users: the Content API rules, over REST', () => {
  // The test app's profile has an `organization`, the way a project adds a relation in the
  // Content-Type Builder: what `$profile.organization.documentId` reads
  const profileAttributes = {
    organization: { type: 'relation', relation: 'oneToOne', target: ORGANIZATION_UID },
    nickname: { type: 'string' },
  };
  let strapi;
  let rq;
  let admin;
  const createdLocales: string[] = [];

  /** `name=value` of the cookie with this name, as a client sends it back. */
  const cookieOf = (res, name: string): string => {
    const cookies = (res.headers['set-cookie'] ?? []) as string[];

    return cookies.find((cookie) => cookie.startsWith(`${name}=`))?.split(';')[0] as string;
  };

  /** A route with no scope: what a signed-in user is, as the strategy leaves it on the context. */
  const addWhoAmI = async ({ strapi: app }) => {
    app.server.routes({
      type: 'content-api',
      routes: [
        {
          method: 'GET',
          path: '/end-users-test/whoami',
          handler(ctx) {
            const { auth } = ctx.state;

            ctx.body = {
              user: ctx.state.user ?? null,
              credentialsAreTheUser: auth.credentials === ctx.state.user,
              strategy: auth.strategy.name,
              isAuthenticated: ctx.state.isAuthenticated,
              // An API token that is not custom has no ability at all
              canFind: auth.ability ? auth.ability.can('api::note.note.find') : null,
              canFindOne: auth.ability ? auth.ability.can('api::note.note.findOne') : null,
            };
          },
        },
      ],
    });
  };

  /** Every type these tests use, the users and their sessions too, and the custom roles after them */
  const emptyAll = async () => {
    await emptyTables(strapi, [
      HOMEPAGE_UID,
      SHELF_UID,
      BANNER_UID,
      BOARD_UID,
      POST_UID,
      NOTE_UID,
      FOLDER_UID,
      ARTICLE_UID,
      TAG_UID,
      ORGANIZATION_UID,
      PROFILE_UID,
      ...ENGINE_UIDS,
    ]);
    await strapi.db.query(PERMISSION_UID).deleteMany({ where: { role: { type: 'custom' } } });
    await strapi.db.query(ROLE_UID).deleteMany({ where: { type: 'custom' } });
  };

  /** What every describe starts from: no data, Public with nothing, Authenticated with its defaults */
  const reset = async () => {
    await emptyAll();
    await resetRoles(strapi);
  };

  /** The Authenticated role: its default grants and the rows given */
  const grant = (...rows: unknown[]) =>
    setRolePermissions(strapi, 'authenticated', [
      ...DEFAULT_AUTHENTICATED_PERMISSIONS,
      ...rows,
    ] as never);

  const createToken = async (body: Record<string, unknown>) => {
    const res = await admin({
      method: 'POST',
      url: '/admin/api-tokens',
      body: { name: `${TOKEN_NAME}-${body.type}-${Date.now()}`, description: 'test', ...body },
    });

    expect(res.status).toBe(201);

    return res.body.data.accessKey as string;
  };

  const as = (token: string) => createContentAPIRequest({ strapi, auth: { token } });

  beforeAll(async () => {
    // `explain: true`: what an end user would get in a header; a token must never get it
    strapi = await createFixturesInstance({
      pluginConfig: { explain: true },
      profileAttributes,
      bootstrap: async (args) => {
        await addWhoAmI(args);
        await args.strapi.contentAPI.permissions.providers.condition.register(IN_MY_ORGANIZATION);
        await args.strapi.contentAPI.permissions.providers.condition.register(TITLE_STARTS_OK);
        await args.strapi.contentAPI.permissions.providers.condition.register(
          OWN_PROFILE_NICKNAME_OK
        );
      },
      builder: createFixtureBuilder()
        .addContentType(shelfModel)
        .addContentType(homepageModel)
        .addContentType(bannerModel)
        .addContentType(boardModel)
        .addContentType(postModel),
    });
    rq = createRequest({ strapi });
    admin = await createAuthRequest({ strapi });

    for (const [code, name] of [
      [FRENCH, 'French'],
      [GERMAN, 'German'],
    ]) {
      // eslint-disable-next-line no-await-in-loop
      if (!(await strapi.db.query('plugin::i18n.locale').findOne({ where: { code } }))) {
        // eslint-disable-next-line no-await-in-loop
        await strapi.db.query('plugin::i18n.locale').create({ data: { code, name } });
        createdLocales.push(code);
      }
    }

    await reset();
  });

  afterAll(async () => {
    await reset();
    await strapi.db
      .query('admin::api-token')
      .deleteMany({ where: { name: { $startsWith: TOKEN_NAME } } });

    if (createdLocales.length > 0) {
      await strapi.db
        .query('plugin::i18n.locale')
        .deleteMany({ where: { code: { $in: createdLocales } } });
    }

    await strapi.destroy();
  });

  describe('the strategy', () => {
    let roles;
    let permissions;
    let authenticatedRoleId: string;
    let noteId: string;
    let emails = 0;

    const FIND = 'api::note.note.find';

    /** Public holds `publicActions` and Authenticated `authenticatedActions` (find, by default) */
    const setRoles = async (publicActions: string[] = [], authenticatedActions = [FIND]) => {
      await setRolePermissions(
        strapi,
        'public',
        publicActions.map((action) => row(action))
      );
      await setRolePermissions(
        strapi,
        'authenticated',
        authenticatedActions.map((action) => row(action))
      );
    };

    const allow = (roleDocumentId: string, ...actions: string[]) =>
      permissions.applyDiff(roleDocumentId, {
        create: actions.map((action) => row(action)),
        update: [],
        delete: [],
      });

    const roleIdOf = async (type: string) =>
      (await strapi.db.query(ROLE_UID).findOne({ where: { type } })).documentId as string;

    /** A user who signed up: their document id and what they would send to be recognized */
    const signUp = async () => {
      emails += 1;

      const res = await rq.post('/api/auth/sign-up/email', {
        body: {
          email: `strategy-${emails}@example.com`,
          password: TEST_PASSWORD,
          name: 'Strategy',
        },
        headers: { Origin: TEST_ORIGIN },
      });

      expect(res.statusCode).toBe(200);

      return {
        documentId: res.body.user.id as string,
        email: res.body.user.email as string,
        token: res.headers['set-auth-token'] as string,
        cookie: cookieOf(res, 'strapi.session_token'),
      };
    };

    const giveRoles = (documentId: string, ...roleDocumentIds: string[]) =>
      strapi.documents(USER_UID).update({
        documentId,
        data: { roles: { set: roleDocumentIds } },
      });

    // Not the Document Service: no middleware that revokes sessions runs, so the request that follows
    // is refused by the strategy's own check and nothing else
    const banUser = (documentId: string, data: Record<string, unknown>) =>
      strapi.db.query(USER_UID).update({ where: { documentId }, data });

    const expireSessionsOf = (documentId: string) =>
      strapi.db.query(SESSION_UID).updateMany({
        where: { userId: documentId },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

    beforeAll(async () => {
      await reset();

      roles = strapi.plugin('end-users').service('role');
      permissions = strapi.plugin('end-users').service('permission');
      authenticatedRoleId = await roleIdOf('authenticated');

      // Authenticated may find notes, Public may do nothing
      await setRoles();

      noteId = (await strapi.documents(NOTE_UID).create({ data: { title: 'first' } })).documentId;
    });

    it('lets a signed-in user call a route their role allows with a Bearer token or the session cookie, and refuses the rest with 403, not 401', async () => {
      const { token, cookie } = await signUp();

      const byToken = await rq.get('/api/notes', { headers: bearer(token) });

      expect(byToken.statusCode).toBe(200);
      expect(byToken.body.data.map((note) => note.title)).toContain('first');
      expect((await rq.get('/api/notes', { headers: { Cookie: cookie } })).statusCode).toBe(200);

      const refused = await rq.get(`/api/notes/${noteId}`, { headers: bearer(token) });

      expect(refused.statusCode).toBe(403);
      expect(refused.body.error.name).toBe('ForbiddenError');
    });

    it('puts the documented user on the context, with the roles they hold and nothing private', async () => {
      const { token, documentId, email } = await signUp();

      const res = await rq.get('/api/end-users-test/whoami', { headers: bearer(token) });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        strategy: 'end-users',
        isAuthenticated: true,
        credentialsAreTheUser: true,
        canFind: true,
        canFindOne: false,
      });
      expect(res.body.user).toEqual({
        id: expect.any(Number),
        documentId,
        email,
        username: null,
        name: 'Strategy',
        image: null,
        emailVerified: false,
        roles: [{ documentId: authenticatedRoleId, name: 'Authenticated', type: 'authenticated' }],
      });

      for (const key of ['password', 'banned', 'banReason', 'banExpires', 'twoFactorEnabled']) {
        expect(res.body.user).not.toHaveProperty(key);
      }
    });

    it('answers Public with 403, not 401, when it has no permission, lets it do what it was given and no more, and 401 on a route with no scope', async () => {
      expect((await rq.get('/api/notes')).statusCode).toBe(403);
      // Cookies that are not a session are no credentials
      expect(
        (await rq.get('/api/notes', { headers: { Cookie: '_ga=GA1.2.3; theme=dark' } })).statusCode
      ).toBe(403);
      // On a route with no scope there is nobody to allow
      expect((await rq.get('/api/end-users-test/whoami')).statusCode).toBe(401);

      await setRoles([FIND]);

      try {
        expect((await rq.get('/api/notes')).statusCode).toBe(200);
        expect((await rq.get(`/api/notes/${noteId}`)).statusCode).toBe(403);
      } finally {
        await setRoles();
      }

      expect((await rq.get('/api/notes')).statusCode).toBe(403);
    });

    it('answers 401 to credentials that are not good, and never falls back to Public', async () => {
      const { cookie } = await signUp();
      const tokenUser = await signUp();

      // Public may find notes here: if a bad token were read as no token, this would be a 200
      await setRoles([FIND]);

      try {
        expect((await rq.get('/api/notes', { headers: bearer('not-a-token') })).statusCode).toBe(
          401
        );
      } finally {
        await setRoles();
      }

      // A session cookie that names no session
      expect(
        (
          await rq.get('/api/notes', {
            headers: { Cookie: '_ga=GA1.2.3; strapi.session_token=nope' },
          })
        ).statusCode
      ).toBe(401);

      // A bad Bearer token beside a good cookie: the token decides (the cookie alone is let in)
      expect((await rq.get('/api/notes', { headers: { Cookie: cookie } })).statusCode).toBe(200);
      expect(
        (
          await rq.get('/api/notes', {
            headers: { Cookie: cookie, authorization: 'Bearer a.b' },
          })
        ).statusCode
      ).toBe(401);

      // A good token beside a good cookie: the token's user, not the cookie's
      const both = await rq.get('/api/end-users-test/whoami', {
        headers: { Cookie: cookie, ...bearer(tokenUser.token) },
      });

      expect(both.statusCode).toBe(200);
      expect(both.body.user.documentId).toBe(tokenUser.documentId);
    });

    it('ends a session on the very next request when it is revoked, has expired or its user is gone', async () => {
      const revoked = await signUp();

      expect((await rq.get('/api/notes', { headers: bearer(revoked.token) })).statusCode).toBe(200);

      await strapi.plugin('end-users').service('engine').get().revokeSessions(revoked.documentId);

      expect((await rq.get('/api/notes', { headers: bearer(revoked.token) })).statusCode).toBe(401);
      expect((await rq.get('/api/notes', { headers: { Cookie: revoked.cookie } })).statusCode).toBe(
        401
      );

      // An expired session, and the cookie it came with is cleared, so the client stops sending it
      const expired = await signUp();
      const other = await signUp();

      await expireSessionsOf(expired.documentId);

      expect((await rq.get('/api/notes', { headers: bearer(expired.token) })).statusCode).toBe(401);

      await expireSessionsOf(other.documentId);

      const res = await rq.get('/api/notes', { headers: { Cookie: other.cookie } });
      const cleared = ((res.headers['set-cookie'] ?? []) as string[]).find((value) =>
        value.startsWith('strapi.session_token=;')
      );

      expect(res.statusCode).toBe(401);
      expect(cleared).toMatch(/Max-Age=0/i);
      expect(res.headers['cache-control']).toContain('no-store');

      // A session whose user was deleted
      const deleted = await signUp();

      await strapi.db.query(USER_UID).delete({ where: { documentId: deleted.documentId } });

      expect((await rq.get('/api/notes', { headers: bearer(deleted.token) })).statusCode).toBe(401);
    });

    it('unions the permissions of the roles a user holds, lists them all, and follows a change of roles on the next request', async () => {
      const stamp = Date.now();
      // role A: note.find, role B: note.findOne
      const finder = await roles.create({
        name: `Finders ${stamp}`,
        permissions: [row('api::note.note.find')],
      });
      const reader = await roles.create({
        name: `Readers ${stamp}`,
        permissions: [row('api::note.note.findOne')],
      });
      const { token, documentId } = await signUp();

      await giveRoles(documentId, finder.documentId, reader.documentId);

      expect((await rq.get('/api/notes', { headers: bearer(token) })).statusCode).toBe(200);
      expect((await rq.get(`/api/notes/${noteId}`, { headers: bearer(token) })).statusCode).toBe(
        200
      );
      // and nothing that neither of them has
      expect((await rq.delete(`/api/notes/${noteId}`, { headers: bearer(token) })).statusCode).toBe(
        403
      );

      const { user } = (await rq.get('/api/end-users-test/whoami', { headers: bearer(token) }))
        .body;

      expect(user.roles.map((role) => role.documentId).sort()).toEqual(
        [finder.documentId, reader.documentId].sort()
      );
      expect(user.roles.every((role) => role.type === 'custom')).toBe(true);

      // One of the roles gives only what that role has
      await giveRoles(documentId, reader.documentId);

      expect((await rq.get(`/api/notes/${noteId}`, { headers: bearer(token) })).statusCode).toBe(
        200
      );
      expect((await rq.get('/api/notes', { headers: bearer(token) })).statusCode).toBe(403);

      // And a change of roles shows on the next request
      await giveRoles(documentId, authenticatedRoleId);

      expect((await rq.get(`/api/notes/${noteId}`, { headers: bearer(token) })).statusCode).toBe(
        403
      );

      await giveRoles(documentId, authenticatedRoleId, reader.documentId);

      expect((await rq.get(`/api/notes/${noteId}`, { headers: bearer(token) })).statusCode).toBe(
        200
      );
    });

    it('takes a change to the permissions of a role into account on the next request, though they are kept in memory', async () => {
      const { token } = await signUp();

      // The permissions of the Authenticated role are now in memory
      expect((await rq.get(`/api/notes/${noteId}`, { headers: bearer(token) })).statusCode).toBe(
        403
      );

      await allow(authenticatedRoleId, 'api::note.note.findOne');

      expect((await rq.get(`/api/notes/${noteId}`, { headers: bearer(token) })).statusCode).toBe(
        200
      );

      const stored = await permissions.findForRoles([authenticatedRoleId]);
      const added = stored.find(({ action }) => action === 'api::note.note.findOne');

      await permissions.applyDiff(authenticatedRoleId, {
        create: [],
        update: [],
        delete: [added.documentId],
      });

      expect((await rq.get(`/api/notes/${noteId}`, { headers: bearer(token) })).statusCode).toBe(
        403
      );
    });

    it('refuses a banned user on the very next request with USER_BANNED, on a route with no scope and with the cookie too, until the ban is lifted or runs out', async () => {
      const { token, cookie, documentId } = await signUp();

      expect((await rq.get('/api/notes', { headers: bearer(token) })).statusCode).toBe(200);

      await banUser(documentId, { banned: true });

      for (const [path, headers] of [
        ['/api/notes', bearer(token)],
        ['/api/end-users-test/whoami', bearer(token)],
        ['/api/notes', { Cookie: cookie }],
      ] as const) {
        // eslint-disable-next-line no-await-in-loop
        const res = await rq.get(path, { headers });

        // The path rides inside the asserted object, so a failure names the route
        expect({ path, status: res.statusCode, code: res.body.error?.details?.code }).toEqual({
          path,
          status: 403,
          code: 'USER_BANNED',
        });
      }

      await banUser(documentId, { banned: false });
      expect((await rq.get('/api/notes', { headers: bearer(token) })).statusCode).toBe(200);

      await banUser(documentId, { banned: true, banExpires: new Date(Date.now() + DAY) });
      expect((await rq.get('/api/notes', { headers: bearer(token) })).statusCode).toBe(403);

      await banUser(documentId, { banned: true, banExpires: new Date(Date.now() - 1000) });
      expect((await rq.get('/api/notes', { headers: bearer(token) })).statusCode).toBe(200);
    });

    it('refuses an unverified user with EMAIL_NOT_VERIFIED while verification is required, and lets them in once they are verified', async () => {
      const settings = strapi.plugin('end-users').service('settings');
      // Signed up before verification was required, so they hold a session
      const { token, cookie, documentId } = await signUp();

      await settings.set({ signUp: { requireEmailVerification: true } });

      try {
        for (const headers of [bearer(token), { Cookie: cookie }]) {
          // eslint-disable-next-line no-await-in-loop
          const res = await rq.get('/api/notes', { headers });

          expect(res.statusCode).toBe(403);
          expect(res.body.error.details.code).toBe('EMAIL_NOT_VERIFIED');
        }

        await strapi.db
          .query(USER_UID)
          .update({ where: { documentId }, data: { emailVerified: true } });

        expect((await rq.get('/api/notes', { headers: bearer(token) })).statusCode).toBe(200);
      } finally {
        await settings.set({ signUp: { requireEmailVerification: false } });
      }
    });

    it('refuses a user who holds a role that requires two-factor and has not enabled it, with TWO_FACTOR_REQUIRED', async () => {
      const guarded = await roles.create({
        name: `Two-factor ${Date.now()}`,
        requireTwoFactor: true,
        permissions: [row('api::note.note.find')],
      });
      const { token, cookie, documentId } = await signUp();

      await giveRoles(documentId, authenticatedRoleId, guarded.documentId);

      for (const headers of [bearer(token), { Cookie: cookie }]) {
        // eslint-disable-next-line no-await-in-loop
        const res = await rq.get('/api/notes', { headers });

        expect(res.statusCode).toBe(403);
        expect(res.body.error.details.code).toBe('TWO_FACTOR_REQUIRED');
      }

      // a route with no scope too: the refusal is the strategy's, not the route's
      const whoami = await rq.get('/api/end-users-test/whoami', { headers: bearer(token) });

      expect(whoami.statusCode).toBe(403);
      expect(whoami.body.error.details.code).toBe('TWO_FACTOR_REQUIRED');

      // Once two-factor is enabled the user is let in
      await strapi.db
        .query(USER_UID)
        .update({ where: { documentId }, data: { twoFactorEnabled: true } });

      expect((await rq.get('/api/notes', { headers: bearer(token) })).statusCode).toBe(200);
    });

    it('refuses a write made with the session cookie from an origin that is not trusted, and lets the rest through', async () => {
      await setRoles([], [FIND, 'api::note.note.create']);

      try {
        const { cookie, token } = await signUp();
        const createNote = (headers: Record<string, string>) =>
          rq.post('/api/notes', { headers, body: { data: { title: 'written' } } });

        // From a foreign origin, from a foreign page (the Referer), with neither, and with the Origin null
        for (const headers of [
          { Cookie: cookie, Origin: FOREIGN },
          { Cookie: cookie, Referer: `${FOREIGN}/form` },
          { Cookie: cookie },
          { Cookie: cookie, Origin: 'null' },
        ]) {
          // eslint-disable-next-line no-await-in-loop
          const res = await createNote(headers);

          expect({ headers, status: res.statusCode, code: res.body.error?.details?.code }).toEqual({
            headers,
            status: 403,
            code: 'ORIGIN_NOT_TRUSTED',
          });
        }

        // A trusted origin and the server itself (`server.url`, or the address Strapi derives from host and port)
        const self = new URL(
          strapi.config.get('server.url') || strapi.config.get('server.absoluteUrl')
        ).origin;

        expect((await createNote({ Cookie: cookie, Origin: TEST_ORIGIN })).statusCode).toBe(201);
        expect((await createNote({ Cookie: cookie, Origin: self })).statusCode).toBe(201);
        // A Bearer token is not checked: no other site can make a browser send one. Nor is a read
        expect((await createNote({ ...bearer(token), Origin: FOREIGN })).statusCode).toBe(201);
        expect(
          (await rq.get('/api/notes', { headers: { Cookie: cookie, Origin: FOREIGN } })).statusCode
        ).toBe(200);
      } finally {
        await setRoles();
      }
    });

    it('extends a session that is due, and sends the fresh cookie to a cookie client only', async () => {
      const expiresAtOf = async (documentId: string) =>
        new Date(
          (await strapi.db.query(SESSION_UID).findOne({ where: { userId: documentId } })).expiresAt
        ).getTime();
      // Older than the update age (a day), well inside its lifetime (a week)
      const makeDue = (documentId: string) =>
        strapi.db.query(SESSION_UID).updateMany({
          where: { userId: documentId },
          data: { expiresAt: new Date(Date.now() + 5 * DAY) },
        });

      const fresh = await signUp();

      // Not due: no cookie
      const notDue = await rq.get('/api/notes', { headers: { Cookie: fresh.cookie } });

      expect(notDue.statusCode).toBe(200);
      expect(notDue.headers['set-cookie']).toBeUndefined();

      await makeDue(fresh.documentId);

      const res = await rq.get('/api/notes', { headers: { Cookie: fresh.cookie } });
      const cookie = (res.headers['set-cookie'] as string[]).find((value) =>
        value.startsWith('strapi.session_token=')
      ) as string;

      expect(res.statusCode).toBe(200);
      expect(cookie).toMatch(/Max-Age=\d+/i);
      expect(cookie).toMatch(/HttpOnly/i);
      expect(res.headers['cache-control']).toContain('no-store');
      expect(await expiresAtOf(fresh.documentId)).toBeGreaterThan(Date.now() + 6 * DAY);
      // and the cookie it sent is one that still works
      expect(
        (await rq.get('/api/notes', { headers: { Cookie: cookie.split(';')[0] } })).statusCode
      ).toBe(200);

      // A Bearer client is extended too, without a cookie it would not use
      const bearerUser = await signUp();

      await makeDue(bearerUser.documentId);

      const viaBearer = await rq.get('/api/notes', { headers: bearer(bearerUser.token) });

      expect(viaBearer.statusCode).toBe(200);
      expect(viaBearer.headers['set-cookie']).toBeUndefined();
      expect(await expiresAtOf(bearerUser.documentId)).toBeGreaterThan(Date.now() + 6 * DAY);
    });

    it('keeps API tokens working ahead of the strategy, with the permissions of the token and not of any role', async () => {
      const fullAccess = await createToken({ type: 'full-access' });
      const findOnly = await createToken({ type: 'custom', permissions: [FIND] });

      // A full-access token is let through everywhere, and is no end user: the context has the token
      expect((await as(fullAccess).get('/notes')).status).toBe(200);
      expect((await as(fullAccess).get(`/notes/${noteId}`)).status).toBe(200);

      const whoami = await as(fullAccess).get('/end-users-test/whoami');

      expect(whoami.status).toBe(200);
      expect(whoami.body.strategy).toBe('content-api-token');
      expect(whoami.body.user).toBeNull();
      expect(whoami.body.canFind).toBeNull();

      expect((await as(findOnly).get('/notes')).status).toBe(200);
      expect((await as(findOnly).get(`/notes/${noteId}`)).status).toBe(403);

      // Anything that is not a token is refused as any other unknown Bearer value is
      expect((await as(`${fullAccess}-x`).get('/notes')).status).toBe(401);
    });
  });

  describe('field rules', () => {
    const NOTE_FIND = ['title', 'body', 'owner', 'folder'];

    /** A row with the fields (and the populate depth) it lists */
    const fieldsRow = (
      action: string,
      subject: string,
      fields?: string[],
      populateDepth?: number
    ) =>
      unconditioned(action, subject, {
        ...(fields ? { fields } : {}),
        ...(populateDepth === undefined ? {} : { populateDepth }),
      });

    /**
     * Authenticated: notes list `title`, `body`, `owner` and `folder` on `find` and add `secret` on
     * `findOne`; folders list `notes` only (their `name` is hidden); articles are written with a
     * create list and a shorter update list.
     */
    const GRANTS = [
      fieldsRow(`${NOTE_UID}.find`, NOTE_UID, NOTE_FIND),
      fieldsRow(`${NOTE_UID}.findOne`, NOTE_UID, [...NOTE_FIND, 'secret']),
      fieldsRow(`${FOLDER_UID}.find`, FOLDER_UID, ['notes']),
      fieldsRow(`${ARTICLE_UID}.find`, ARTICLE_UID, ['title', 'seo.metaTitle', 'author']),
      fieldsRow(`${ARTICLE_UID}.create`, ARTICLE_UID, ['title', 'body', 'seo.metaTitle']),
      fieldsRow(`${ARTICLE_UID}.update`, ARTICLE_UID, ['body']),
    ];

    let a: { token: string; documentId: string };
    let note: { documentId: string };
    let folder: { documentId: string };

    const get = (url: string) => rq.get(url, { headers: bearer(a.token) });

    beforeAll(async () => {
      await reset();
      await grant(...GRANTS);

      a = await createSignedInUser(rq, 'field-rules-a@example.com');

      folder = await strapi.documents(FOLDER_UID).create({ data: { name: 'Inbox' } });
      note = await strapi.documents(NOTE_UID).create({
        data: {
          title: 'first',
          body: 'text',
          secret: 'hidden',
          owner: { connect: [{ documentId: a.documentId }] },
          folder: { connect: [{ documentId: folder.documentId }] },
        },
      });

      // Published, so the draft & publish type is readable without read-drafts
      await strapi.documents(ARTICLE_UID).create({
        status: 'published',
        data: {
          title: 'article',
          body: 'text',
          internalNotes: 'private',
          seo: { metaTitle: 'meta title', metaDescription: 'meta description' },
        },
      });
    });

    it('strips a field missing from the find list, uses the findOne fields on GET /:id, and keeps an allowed component sub-path', async () => {
      const list = await get('/api/notes');

      expect(list.statusCode).toBe(200);
      expect(list.body.data.length).toBeGreaterThan(0);
      expect(list.body.data.every((n) => !('secret' in n) && 'title' in n)).toBe(true);

      const one = await get(`/api/notes/${note.documentId}`);

      expect(one.statusCode).toBe(200);
      expect(one.body.data).toMatchObject({ title: 'first', secret: 'hidden' });

      const articles = await get('/api/articles?populate=seo');

      expect(articles.statusCode).toBe(200);
      expect(articles.body.data[0].seo).toMatchObject({ metaTitle: 'meta title' });
      expect(articles.body.data[0].seo).not.toHaveProperty('metaDescription');
      expect(articles.body.data[0]).not.toHaveProperty('body');
    });

    it("applies the target type's find fields to a populated relation", async () => {
      const res = await get(`/api/notes/${note.documentId}?populate=folder`);

      expect(res.statusCode).toBe(200);
      // Folders list `notes` only: the note's own list does not decide what its folder shows
      expect(res.body.data.folder.documentId).toBe(folder.documentId);
      expect(res.body.data.folder).not.toHaveProperty('name');
    });

    it('answers 400 naming the field when a create sends one outside the create list, or a component field it does not name', async () => {
      const outside = await rq.post('/api/articles', {
        headers: bearer(a.token),
        body: { data: { title: 'draft', internalNotes: 'x' } },
      });

      expect(outside.statusCode).toBe(400);
      expect(outside.body.error.message).toContain('internalNotes');
      expect(outside.body.error.details).toMatchObject({ key: 'internalNotes' });

      const component = await rq.post('/api/articles', {
        headers: bearer(a.token),
        body: { data: { title: 'draft', seo: { metaDescription: 'x' } } },
      });

      expect(component.statusCode).toBe(400);
      expect(component.body.error.message).toContain('metaDescription');
    });

    it('accepts title on create and refuses it on update, where the list names body only', async () => {
      const created = await rq.post('/api/articles', {
        headers: bearer(a.token),
        body: { data: { title: 'allowed', seo: { metaTitle: 'm' } } },
      });

      expect(created.statusCode).toBe(201);

      const refused = await rq.put(`/api/articles/${created.body.data.documentId}`, {
        headers: bearer(a.token),
        body: { data: { title: 'renamed' } },
      });

      expect(refused.statusCode).toBe(400);
      expect(refused.body.error.message).toContain('title');

      const allowed = await rq.put(`/api/articles/${created.body.data.documentId}`, {
        headers: bearer(a.token),
        body: { data: { body: 'edited' } },
      });

      expect(allowed.statusCode).toBe(200);
    });

    it('answers 400 to a filter, a sort, a populate filter and a search on a hidden field, and lets through what the lists name', async () => {
      // folder's find fields exclude `name`, and note's find fields exclude `secret`
      for (const qs of [
        'filters[secret][$eq]=x',
        'sort=secret',
        'populate[folder][filters][name]=x',
        '_q=x',
      ]) {
        // eslint-disable-next-line no-await-in-loop
        const res = await get(`/api/notes?${qs}`);

        expect({ qs, status: res.statusCode }).toEqual({ qs, status: 400 });
      }

      // `fields=` naming a hidden field is not an error: the field is not there
      const res = await get('/api/notes?filters[title][$eq]=first&sort=title&fields=title,secret');

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).not.toHaveProperty('secret');
    });

    it('answers 400 beyond the populate depth limit, naming the type', async () => {
      await grant(
        ...GRANTS.filter((permission) => permission.action !== `${NOTE_UID}.find`),
        fieldsRow(`${NOTE_UID}.find`, NOTE_UID, NOTE_FIND, 1)
      );

      try {
        const within = await get('/api/notes?populate=folder');

        expect(within.statusCode).toBe(200);

        const beyond = await get('/api/notes?populate[folder][populate][notes]=true');

        expect(beyond.statusCode).toBe(400);
        expect(beyond.body.error.message).toContain('api::note.note');
      } finally {
        await grant(...GRANTS);
      }
    });
  });

  describe('the drafts gate', () => {
    /** Every article, tag, shelf and the homepage, published or not as the route allows; no draft reads */
    const READS = [
      unconditioned(`${ARTICLE_UID}.find`, ARTICLE_UID),
      unconditioned(`${ARTICLE_UID}.findOne`, ARTICLE_UID),
      unconditioned(`${TAG_UID}.find`, TAG_UID),
      unconditioned(`${TAG_UID}.findOne`, TAG_UID),
      unconditioned(`${SHELF_UID}.find`, SHELF_UID),
      unconditioned(`${SHELF_UID}.findOne`, SHELF_UID),
      unconditioned(`${HOMEPAGE_UID}.find`, HOMEPAGE_UID),
    ];
    const READ_ARTICLE_DRAFTS = unconditioned(`${ARTICLE_UID}.read-drafts`, ARTICLE_UID);
    const READ_TAG_DRAFTS = unconditioned(`${TAG_UID}.read-drafts`, TAG_UID);
    const DRAFT_TAG = 'a-draft-tag';
    const PUBLISHED_TAG = 'a-published-tag';

    let a: { token: string; documentId: string };
    let b: { token: string; documentId: string };
    /** A's draft (never published), tagged with a draft-only tag */
    let draftOfA: string;
    /** B's draft (never published) */
    let draftOfB: string;
    /** A published article with no author, tagged with a published tag */
    let published: string;
    /** A shelf holding all three articles, every version of each */
    let shelf: string;

    const get = (url: string, caller: { token: string } = a) =>
      rq.get(url, { headers: bearer(caller.token) });

    const documentIdsOf = (res: { body: { data: Array<{ documentId: string }> } }) =>
      res.body.data.map(({ documentId }) => documentId).sort();

    beforeAll(async () => {
      await reset();
      await setRolePermissions(strapi, 'public', [
        unconditioned(`${ARTICLE_UID}.find`, ARTICLE_UID),
      ]);
      await grant(...READS);

      a = await createSignedInUser(rq, 'drafts-a@example.com');
      b = await createSignedInUser(rq, 'drafts-b@example.com');

      const draftTag = await strapi.documents(TAG_UID).create({ data: { name: DRAFT_TAG } });
      const publishedTag = await strapi
        .documents(TAG_UID)
        .create({ data: { name: PUBLISHED_TAG }, status: 'published' });

      draftOfA = (
        await strapi.documents(ARTICLE_UID).create({
          data: {
            title: 'draft of a',
            author: { connect: [{ documentId: a.documentId }] },
            tags: { connect: [{ documentId: draftTag.documentId }] },
          },
        })
      ).documentId;

      draftOfB = (
        await strapi.documents(ARTICLE_UID).create({
          data: { title: 'draft of b', author: { connect: [{ documentId: b.documentId }] } },
        })
      ).documentId;

      published = (
        await strapi.documents(ARTICLE_UID).create({
          data: {
            title: 'published',
            tags: { connect: [{ documentId: publishedTag.documentId }] },
          },
          status: 'published',
        })
      ).documentId;

      shelf = (
        await strapi.documents(SHELF_UID).create({
          data: {
            name: 'shelf',
            articles: {
              connect: [
                { documentId: draftOfA },
                { documentId: draftOfB },
                { documentId: published },
              ],
            },
          },
        })
      ).documentId;

      // Published: its draft links to both tags' drafts, its published version to the published tag
      await strapi.documents(HOMEPAGE_UID).create({
        data: {
          title: 'home',
          tags: {
            connect: [{ documentId: draftTag.documentId }, { documentId: publishedTag.documentId }],
          },
          shelf: { connect: [{ documentId: shelf }] },
        },
        status: 'published',
      });
    });

    beforeEach(async () => {
      await grant(...READS);
    });

    it('answers 403 DRAFT_READ_FORBIDDEN to every way of asking for drafts without read-drafts, to Public too', async () => {
      for (const qs of [
        'status=draft',
        'hasPublishedVersion=false',
        'publicationFilter=never-published',
        // What the Document Service reads as a draft
        'status=',
        'status=DRAFT',
        'status[0]=draft',
      ]) {
        // eslint-disable-next-line no-await-in-loop
        const res = await get(`/api/articles?${qs}`);

        expect({ qs, status: res.statusCode, body: res.body }).toEqual({
          qs,
          status: 403,
          body: draftsForbidden(ARTICLE_UID),
        });
      }

      const one = await get(`/api/articles/${draftOfA}?status=draft`);
      const anonymous = await rq.get('/api/articles?status=draft');

      expect(one.statusCode).toBe(403);
      expect(one.body).toEqual(draftsForbidden(ARTICLE_UID));
      expect(anonymous.statusCode).toBe(403);
      expect(anonymous.body).toEqual(draftsForbidden(ARTICLE_UID));
    });

    it('returns drafts with read-drafts, and only the ones its condition allows', async () => {
      await grant(...READS, READ_ARTICLE_DRAFTS);

      const all = await get('/api/articles?status=draft&pagination[pageSize]=100');

      expect(all.statusCode).toBe(200);
      expect(documentIdsOf(all)).toEqual([draftOfA, draftOfB, published].sort());
      expect(
        all.body.data.every((entry: { publishedAt: unknown }) => entry.publishedAt === null)
      ).toBe(true);

      // find is unconditioned; read-drafts is is-owner(author): only A's drafts
      await grant(...READS, owned(`${ARTICLE_UID}.read-drafts`, ARTICLE_UID, 'author'));

      const ofA = await get('/api/articles?status=draft&pagination[pageSize]=100', a);
      const ofB = await get('/api/articles?status=draft&pagination[pageSize]=100', b);
      const missing = await get(`/api/articles/${draftOfB}?status=draft`, a);

      expect(ofA.statusCode).toBe(200);
      expect(documentIdsOf(ofA)).toEqual([draftOfA]);
      expect(documentIdsOf(ofB)).toEqual([draftOfB]);
      expect(missing.statusCode).toBe(404);
      // Published reads are untouched by the read-drafts condition
      expect(documentIdsOf(await get('/api/articles', a))).toEqual([published]);
    });

    it('refuses populating or filtering tag drafts without read-drafts on tags, and allows both with read-drafts on both types', async () => {
      await grant(...READS, READ_ARTICLE_DRAFTS);

      for (const qs of [
        'populate=tags',
        'populate=*',
        'populate[tags][fields][0]=name',
        `filters[tags][name][$eq]=${DRAFT_TAG}`,
        `filters[$or][0][tags][name][$eq]=${DRAFT_TAG}`,
        'sort=tags.name',
      ]) {
        // eslint-disable-next-line no-await-in-loop
        const res = await get(`/api/articles?status=draft&${qs}`);

        expect({ qs, status: res.statusCode, body: res.body }).toEqual({
          qs,
          status: 403,
          body: draftsForbidden(TAG_UID),
        });
      }

      await grant(...READS, READ_ARTICLE_DRAFTS, READ_TAG_DRAFTS);

      const populated = await get(
        `/api/articles?status=draft&populate=tags&filters[documentId][$eq]=${draftOfA}`
      );
      const filtered = await get(
        `/api/articles?status=draft&filters[tags][name][$eq]=${DRAFT_TAG}&pagination[pageSize]=100`
      );

      expect(populated.statusCode).toBe(200);
      expect(populated.body.data).toHaveLength(1);
      expect(populated.body.data[0].tags.map((tag: { name: string }) => tag.name)).toEqual([
        DRAFT_TAG,
      ]);
      expect(filtered.statusCode).toBe(200);
      expect(documentIdsOf(filtered)).toEqual([draftOfA]);
    });

    it('keeps published reads unchanged', async () => {
      const list = await get('/api/articles?populate=tags');
      const explicit = await get('/api/articles?status=published&populate=tags');
      const one = await get(`/api/articles/${published}`);

      expect(list.statusCode).toBe(200);
      expect(documentIdsOf(list)).toEqual([published]);
      // Populated relations are published for a caller without read-drafts
      expect(list.body.data[0].tags).toEqual([
        expect.objectContaining({ name: PUBLISHED_TAG, publishedAt: expect.any(String) }),
      ]);
      expect(explicit.body.data).toEqual(list.body.data);
      expect(one.statusCode).toBe(200);
      expect(one.body.data.documentId).toBe(published);
      // No draft is listed or reachable through a filter
      expect(
        documentIdsOf(await get(`/api/articles?filters[tags][name][$eq]=${DRAFT_TAG}`))
      ).toEqual([]);
      expect((await get(`/api/articles/${draftOfA}`)).statusCode).toBe(404);
    });

    it("lets a create ask for a draft without read-drafts, and gates the tags a draft write populates or filters, not the write's own draft", async () => {
      await grant(
        ...READS,
        unconditioned(`${ARTICLE_UID}.create`, ARTICLE_UID),
        unconditioned(`${ARTICLE_UID}.update`, ARTICLE_UID)
      );

      // A create asks for a draft
      const draft = await rq.post('/api/articles?status=draft', {
        headers: bearer(a.token),
        body: { data: { title: 'written as a draft' } },
      });

      expect(draft.statusCode).toBe(201);
      expect(draft.body.data.publishedAt).toBeNull();

      await strapi.documents(ARTICLE_UID).delete({ documentId: draft.body.data.documentId });

      const titleBefore = (await strapi.documents(ARTICLE_UID).findOne({ documentId: draftOfA }))
        .title;

      for (const qs of [
        'status=draft&populate=tags',
        'status=draft&populate[tags][fields][0]=name',
        `status=draft&filters[tags][name][$eq]=${DRAFT_TAG}`,
      ]) {
        // eslint-disable-next-line no-await-in-loop
        const updated = await rq.put(`/api/articles/${draftOfA}?${qs}`, {
          headers: bearer(a.token),
          body: { data: { title: 'changed through a refused write' } },
        });
        // eslint-disable-next-line no-await-in-loop
        const created = await rq.post(`/api/articles?${qs}`, {
          headers: bearer(a.token),
          body: { data: { title: 'refused create' } },
        });

        expect(updated.statusCode).toBe(403);
        expect(updated.body).toEqual(draftsForbidden(TAG_UID));
        expect(created.statusCode).toBe(403);
        expect(created.body).toEqual(draftsForbidden(TAG_UID));
      }

      // Refused before anything was written
      expect((await strapi.documents(ARTICLE_UID).findOne({ documentId: draftOfA })).title).toBe(
        titleBefore
      );
      expect(
        await strapi.documents(ARTICLE_UID).count({ filters: { title: 'refused create' } })
      ).toBe(0);

      // The written draft itself comes back without read-drafts on articles
      const own = await rq.put(`/api/articles/${draftOfA}?status=draft`, {
        headers: bearer(a.token),
        body: { data: { title: titleBefore } },
      });

      expect(own.statusCode).toBe(200);
      expect(own.body.data).toMatchObject({ documentId: draftOfA, publishedAt: null });

      // With read-drafts on tags, the draft's tags come back
      await grant(...READS, READ_TAG_DRAFTS, unconditioned(`${ARTICLE_UID}.update`, ARTICLE_UID));

      const withTags = await rq.put(`/api/articles/${draftOfA}?status=draft&populate=tags`, {
        headers: bearer(a.token),
        body: { data: { title: titleBefore } },
      });

      expect(withTags.statusCode).toBe(200);
      expect(withTags.body.data.tags.map((tag: { name: string }) => tag.name)).toEqual([DRAFT_TAG]);
    });

    describe('a single type', () => {
      const homepageDraftTitle = async () =>
        (await strapi.documents(HOMEPAGE_UID).findFirst({ status: 'draft' })).title;

      it('answers 403 to a draft read without read-drafts, and reads published tags only', async () => {
        const draft = await get('/api/homepage?status=draft');
        const read = await get('/api/homepage?populate=tags');

        expect(draft.statusCode).toBe(403);
        expect(draft.body).toEqual(draftsForbidden(HOMEPAGE_UID));
        expect(read.statusCode).toBe(200);
        expect(read.body.data.title).toBe('home');
        expect(read.body.data.tags).toEqual([
          expect.objectContaining({ name: PUBLISHED_TAG, publishedAt: expect.any(String) }),
        ]);
      });

      it("gates the tags a draft write populates, not the write's own draft", async () => {
        await grant(...READS, unconditioned(`${HOMEPAGE_UID}.update`, HOMEPAGE_UID));

        const refused = await rq.put('/api/homepage?status=draft&populate=tags', {
          headers: bearer(a.token),
          body: { data: { title: 'changed through a refused write' } },
        });

        expect(refused.statusCode).toBe(403);
        expect(refused.body).toEqual(draftsForbidden(TAG_UID));
        // Refused before anything was written
        expect(await homepageDraftTitle()).toBe('home');

        // With read-drafts on tags, the draft comes back with its tags: drafts of both
        await grant(
          ...READS,
          READ_TAG_DRAFTS,
          unconditioned(`${HOMEPAGE_UID}.update`, HOMEPAGE_UID)
        );

        const own = await rq.put('/api/homepage?status=draft&populate=tags', {
          headers: bearer(a.token),
          body: { data: { title: 'home' } },
        });

        expect(own.statusCode).toBe(200);
        expect(own.body.data).toMatchObject({ title: 'home', publishedAt: null });
        expect(own.body.data.tags.map((tag: { name: string }) => tag.name).sort()).toEqual(
          [DRAFT_TAG, PUBLISHED_TAG].sort()
        );
      });
    });

    describe('a relation filter or sort from a type without draft & publish', () => {
      const shelvesWhere = async (title: string, caller = a) =>
        documentIdsOf(
          await get(
            `/api/shelves?filters[articles][title][$eq]=${encodeURIComponent(title)}`,
            caller
          )
        );

      it("matches the articles' published versions only without read-drafts, and the drafts read-drafts allows, and only those", async () => {
        // The shelf links to every version of each article; the status filter skips the join
        expect(await shelvesWhere('draft of a')).toEqual([]);
        expect(await shelvesWhere('draft of b')).toEqual([]);
        expect(await shelvesWhere('published')).toEqual([shelf]);

        await grant(...READS, owned(`${ARTICLE_UID}.read-drafts`, ARTICLE_UID, 'author'));

        expect(await shelvesWhere('draft of a', a)).toEqual([shelf]);
        expect(await shelvesWhere('draft of b', a)).toEqual([]);
        expect(await shelvesWhere('published', a)).toEqual([shelf]);

        await grant(...READS, READ_ARTICLE_DRAFTS);

        expect(await shelvesWhere('draft of b', a)).toEqual([shelf]);
      });

      it('applies at a crossing below the root, and refuses a sort through the articles without read-drafts', async () => {
        const homepageWhere = (title: string) =>
          get(`/api/homepage?filters[shelf][articles][title][$eq]=${encodeURIComponent(title)}`);

        // No match leaves the single type with no document to return
        expect((await homepageWhere('draft of a')).statusCode).toBe(404);
        expect((await homepageWhere('published')).statusCode).toBe(200);

        const refused = await get('/api/shelves?sort=articles.title');

        expect(refused.statusCode).toBe(400);
        expect(refused.body.error).toMatchObject({
          name: 'ValidationError',
          details: { key: 'articles', param: 'sort' },
        });

        await grant(...READS, READ_ARTICLE_DRAFTS);

        expect((await homepageWhere('draft of a')).statusCode).toBe(200);
        expect((await get('/api/shelves?sort=articles.title')).statusCode).toBe(200);
      });
    });
  });

  describe('the publish gate, the owner and the locked fields of writes', () => {
    let a: { token: string; documentId: string };
    let b: { token: string; documentId: string };

    const ARTICLE_WRITES = [
      owned(`${ARTICLE_UID}.create`, ARTICLE_UID, 'author'),
      owned(`${ARTICLE_UID}.update`, ARTICLE_UID, 'author'),
    ];

    /** What is stored for a document: each version, draft first, with its title and owner */
    const versionsOf = async (uid: string, documentId: string, ownerField: string) =>
      (await strapi.db.query(uid).findMany({ where: { documentId }, populate: [ownerField] }))
        .map((entry) => ({
          published: entry.publishedAt !== null,
          title: entry.title as string,
          owner: entry[ownerField]?.documentId as string | undefined,
        }))
        .sort((x, y) => Number(x.published) - Number(y.published));

    const articlesCount = (status: 'draft' | 'published') =>
      strapi.documents(ARTICLE_UID).count({ status });

    const createArticle = (
      title: string,
      author: string,
      status: 'draft' | 'published' = 'draft'
    ) =>
      strapi.documents(ARTICLE_UID).create({
        status,
        data: { title, author: { connect: [{ documentId: author }] } },
      });

    beforeAll(async () => {
      await reset();

      a = await createSignedInUser(rq, 'publish-a@example.com');
      b = await createSignedInUser(rq, 'publish-b@example.com');
    });

    beforeEach(async () => {
      await emptyTables(strapi, [ARTICLE_UID, BANNER_UID, POST_UID]);
    });

    describe('the publish gate', () => {
      it('creates a draft without publish, even with ?status=published or no status at all', async () => {
        await grant(...ARTICLE_WRITES);

        const publishedBefore = await articlesCount('published');

        const res = await rq.post('/api/articles?status=published', {
          headers: bearer(a.token),
          body: { data: { title: 'd' } },
        });

        expect(res.statusCode).toBe(201);
        expect(res.body.data.publishedAt).toBeNull();
        expect(await articlesCount('published')).toBe(publishedBefore);
        expect(await versionsOf(ARTICLE_UID, res.body.data.documentId, 'author')).toEqual([
          { published: false, title: 'd', owner: a.documentId },
        ]);

        // The REST default is published, which publish gates
        const bare = await rq.post('/api/articles', {
          headers: bearer(a.token),
          body: { data: { title: 'bare' } },
        });

        expect(bare.statusCode).toBe(201);
        expect(bare.body.data.publishedAt).toBeNull();
      });

      it("publishes on create with publish, and the caller's new entry under publish with is-owner", async () => {
        await grant(
          unconditioned(`${ARTICLE_UID}.create`, ARTICLE_UID),
          unconditioned(`${ARTICLE_UID}.publish`, ARTICLE_UID)
        );

        const publishedBefore = await articlesCount('published');

        const res = await rq.post('/api/articles', {
          headers: bearer(a.token),
          body: { data: { title: 'live' } },
        });

        expect(res.statusCode).toBe(201);
        expect(res.body.data.publishedAt).not.toBeNull();
        expect(await articlesCount('published')).toBe(publishedBefore + 1);

        // A draft can still be asked for
        const draft = await rq.post('/api/articles?status=draft', {
          headers: bearer(a.token),
          body: { data: { title: 'wip' } },
        });

        expect(draft.statusCode).toBe(201);
        expect(draft.body.data.publishedAt).toBeNull();

        await grant(...ARTICLE_WRITES, owned(`${ARTICLE_UID}.publish`, ARTICLE_UID, 'author'));

        const mine = await rq.post('/api/articles', {
          headers: bearer(a.token),
          body: { data: { title: 'mine' } },
        });

        expect(mine.statusCode).toBe(201);
        // The published version answers
        expect(mine.body.data.publishedAt).not.toBeNull();
        expect(await versionsOf(ARTICLE_UID, mine.body.data.documentId, 'author')).toEqual([
          { published: false, title: 'mine', owner: a.documentId },
          { published: true, title: 'mine', owner: a.documentId },
        ]);
      });

      it("updates only the draft without publish, and publishes an update of the caller's own article under publish with is-owner", async () => {
        await grant(...ARTICLE_WRITES);

        const { documentId } = await createArticle('published', a.documentId, 'published');

        const res = await rq.put(`/api/articles/${documentId}`, {
          headers: bearer(a.token),
          body: { data: { title: 'edited' } },
        });

        expect(res.statusCode).toBe(200);
        expect(res.body.data.publishedAt).toBeNull();
        expect(await versionsOf(ARTICLE_UID, documentId, 'author')).toEqual([
          { published: false, title: 'edited', owner: a.documentId },
          { published: true, title: 'published', owner: a.documentId },
        ]);

        // Asking for it does not change that
        const asked = await rq.put(`/api/articles/${documentId}?status=published`, {
          headers: bearer(a.token),
          body: { data: { title: 'edited again' } },
        });

        expect(asked.statusCode).toBe(200);
        expect((await versionsOf(ARTICLE_UID, documentId, 'author'))[1].title).toBe('published');

        await grant(...ARTICLE_WRITES, owned(`${ARTICLE_UID}.publish`, ARTICLE_UID, 'author'));

        const published = await rq.put(`/api/articles/${documentId}`, {
          headers: bearer(a.token),
          body: { data: { title: 'edited and published' } },
        });

        expect(published.statusCode).toBe(200);
        expect(published.body.data.publishedAt).not.toBeNull();
        expect(await versionsOf(ARTICLE_UID, documentId, 'author')).toEqual([
          { published: false, title: 'edited and published', owner: a.documentId },
          { published: true, title: 'edited and published', owner: a.documentId },
        ]);
      });

      it("does not publish over a published version that is not the caller's: the draft alone is written", async () => {
        const { documentId } = await createArticle('published', b.documentId, 'published');

        // The draft is handed to A, the published version keeps naming B
        await strapi.documents(ARTICLE_UID).update({
          documentId,
          data: { author: { set: [{ documentId: a.documentId }] } },
        });

        for (const rows of [
          // No publish row: a draft, whoever the published version names
          ARTICLE_WRITES,
          // A conditioned one: the publish replaces B's version, which is not A's
          [...ARTICLE_WRITES, owned(`${ARTICLE_UID}.publish`, ARTICLE_UID, 'author')],
        ]) {
          // eslint-disable-next-line no-await-in-loop
          await grant(...rows);

          // eslint-disable-next-line no-await-in-loop
          const res = await rq.put(`/api/articles/${documentId}`, {
            headers: bearer(a.token),
            body: { data: { title: 'taken over' } },
          });

          expect(res.statusCode).toBe(200);
          expect(res.body.data.publishedAt).toBeNull();
          // eslint-disable-next-line no-await-in-loop
          expect(await versionsOf(ARTICLE_UID, documentId, 'author')).toEqual([
            { published: false, title: 'taken over', owner: a.documentId },
            { published: true, title: 'published', owner: b.documentId },
          ]);
        }

        // Someone else's draft is a 404 whatever the publish says
        const ofB = await createArticle('b', b.documentId);
        const refused = await rq.put(`/api/articles/${ofB.documentId}`, {
          headers: bearer(a.token),
          body: { data: { title: 'pwned' } },
        });

        expect(refused.statusCode).toBe(404);
        expect(refused.body).toEqual(NOT_FOUND);
      });

      it('writes a draft first, so the drafts gate sees it: related drafts are not populated unchecked', async () => {
        await grant(...ARTICLE_WRITES, unconditioned(`${TAG_UID}.find`, TAG_UID));

        const refused = await rq.post('/api/articles?populate=tags', {
          headers: bearer(a.token),
          body: { data: { title: 'with tags' } },
        });

        expect(refused.statusCode).toBe(403);
        expect(refused.body.error.details).toMatchObject({
          code: 'DRAFT_READ_FORBIDDEN',
          uid: TAG_UID,
        });
        expect(await articlesCount('draft')).toBe(0);

        // With publish the write is published, and the tags it shows are the published ones
        await grant(
          ...ARTICLE_WRITES,
          unconditioned(`${ARTICLE_UID}.publish`, ARTICLE_UID),
          unconditioned(`${TAG_UID}.find`, TAG_UID)
        );

        const allowed = await rq.post('/api/articles?populate=tags', {
          headers: bearer(a.token),
          body: { data: { title: 'with tags' } },
        });

        expect(allowed.statusCode).toBe(201);
      });

      describe('a single type', () => {
        const BANNER_WRITES = [
          owned(`${BANNER_UID}.create`, BANNER_UID, 'owner'),
          owned(`${BANNER_UID}.update`, BANNER_UID, 'owner'),
        ];

        const putBanner = (token: string, title: string, qs = '') =>
          rq.put(`/api/banner${qs}`, { headers: bearer(token), body: { data: { title } } });

        const bannerVersions = async () =>
          (await strapi.db.query(BANNER_UID).findMany({ populate: ['owner'] }))
            .map((entry) => ({
              published: entry.publishedAt !== null,
              title: entry.title as string,
              owner: entry.owner?.documentId as string | undefined,
            }))
            .sort((x, y) => Number(x.published) - Number(y.published));

        it('sets the owner on the update that creates the document, and publishes only with publish', async () => {
          await grant(...BANNER_WRITES);

          const first = await putBanner(a.token, 'first', '?status=published');

          expect(first.statusCode).toBe(200);
          expect(first.body.data.publishedAt).toBeNull();
          expect(await bannerVersions()).toEqual([
            { published: false, title: 'first', owner: a.documentId },
          ]);

          // The creator can update it next time, and nobody else can
          expect((await putBanner(a.token, 'second')).statusCode).toBe(200);
          expect((await putBanner(b.token, 'pwned')).statusCode).toBe(404);
          expect((await bannerVersions())[0].title).toBe('second');
        });

        it("publishes the first document with a conditioned publish, because it is the caller's", async () => {
          await grant(...BANNER_WRITES, owned(`${BANNER_UID}.publish`, BANNER_UID, 'owner'));

          const first = await putBanner(a.token, 'first');

          expect(first.statusCode).toBe(200);
          expect(first.body.data.publishedAt).not.toBeNull();
          expect(await bannerVersions()).toEqual([
            { published: false, title: 'first', owner: a.documentId },
            { published: true, title: 'first', owner: a.documentId },
          ]);
        });

        it("does not publish over a published version that is not the caller's", async () => {
          await grant(...BANNER_WRITES, owned(`${BANNER_UID}.publish`, BANNER_UID, 'owner'));

          const { documentId } = await strapi.documents(BANNER_UID).create({
            status: 'published',
            data: { title: 'published', owner: { connect: [{ documentId: b.documentId }] } },
          });

          await strapi.documents(BANNER_UID).update({
            documentId,
            data: { owner: { set: [{ documentId: a.documentId }] } },
          });

          const res = await putBanner(a.token, 'taken over');

          expect(res.statusCode).toBe(200);
          expect(res.body.data.publishedAt).toBeNull();
          expect(await bannerVersions()).toEqual([
            { published: false, title: 'taken over', owner: a.documentId },
            { published: true, title: 'published', owner: b.documentId },
          ]);
        });
      });
    });

    describe('the owner', () => {
      it('sets the owner to the caller on create, and answers 400 naming author when a create body sends one', async () => {
        await grant(...ARTICLE_WRITES);

        const res = await rq.post('/api/articles', {
          headers: bearer(a.token),
          body: { data: { title: 'mine' } },
        });

        expect(res.statusCode).toBe(201);
        expect(await versionsOf(ARTICLE_UID, res.body.data.documentId, 'author')).toEqual([
          { published: false, title: 'mine', owner: a.documentId },
        ]);

        for (const author of [
          { connect: [{ documentId: b.documentId }] },
          { set: [{ documentId: a.documentId }] },
          null,
        ]) {
          // eslint-disable-next-line no-await-in-loop
          const sneaky = await rq.post('/api/articles', {
            headers: bearer(a.token),
            body: { data: { title: 'sneaky', author } },
          });

          expect(sneaky.statusCode).toBe(400);
          expect(sneaky.body.error.name).toBe('ValidationError');
          expect(sneaky.body.error.message).toContain('author');
          expect(sneaky.body.error.details).toMatchObject({ key: 'author' });
        }

        expect(await articlesCount('draft')).toBe(1);

        // The same 400 with user.find: the field is named for every role
        await grant(...ARTICLE_WRITES, unconditioned(`${USER_UID}.find`, USER_UID));

        const withFind = await rq.post('/api/articles', {
          headers: bearer(a.token),
          body: { data: { title: 'sneaky', author: { connect: [{ documentId: b.documentId }] } } },
        });

        expect(withFind.statusCode).toBe(400);
        expect(withFind.body.error.details).toMatchObject({ key: 'author' });
      });

      it("answers 400 naming author when an update changes the owner and changes nothing, and 404, not 400, for someone else's entry", async () => {
        await grant(...ARTICLE_WRITES);

        const { documentId } = await createArticle('mine', a.documentId);

        for (const author of [{ set: [{ documentId: b.documentId }] }, { disconnect: [] }, null]) {
          // eslint-disable-next-line no-await-in-loop
          const res = await rq.put(`/api/articles/${documentId}`, {
            headers: bearer(a.token),
            body: { data: { title: 'handed over', author } },
          });

          expect(res.statusCode).toBe(400);
          expect(res.body.error.name).toBe('ValidationError');
          expect(res.body.error.details).toMatchObject({ key: 'author' });
        }

        expect(await versionsOf(ARTICLE_UID, documentId, 'author')).toEqual([
          { published: false, title: 'mine', owner: a.documentId },
        ]);

        const ofB = await createArticle('b', b.documentId);

        const other = await rq.put(`/api/articles/${ofB.documentId}`, {
          headers: bearer(a.token),
          body: { data: { author: { set: [{ documentId: a.documentId }] } } },
        });

        // The entry check comes first: a 400 would tell A the entry exists
        expect(other.statusCode).toBe(404);
        expect(other.body).toEqual(NOT_FOUND);
      });

      it('refuses a create to a caller the create row cannot name an owner for: Public under is-owner', async () => {
        await setRolePermissions(strapi, 'public', [
          owned(`${NOTE_UID}.create`, NOTE_UID, 'owner'),
        ]);

        const notes = () => strapi.db.query(NOTE_UID).count();
        const before = await notes();

        const res = await rq.post('/api/notes', { body: { data: { title: 'ownerless' } } });

        expect(res.statusCode).toBe(403);
        expect(await notes()).toBe(before);

        await setRolePermissions(strapi, 'public', []);

        // The Authenticated role with the same row is stamped and let through
        await grant(owned(`${NOTE_UID}.create`, NOTE_UID, 'owner'));

        const own = await rq.post('/api/notes', {
          headers: bearer(a.token),
          body: { data: { title: 'mine' } },
        });

        expect(own.statusCode).toBe(201);
        expect(await notes()).toBe(before + 1);
      });
    });

    describe('a localized collection type', () => {
      const createPost = async (owner: string) =>
        (
          await strapi.documents(POST_UID).create({
            locale: 'en',
            data: { title: 'post', owner: { connect: [{ documentId: owner }] } },
          })
        ).documentId as string;

      const ownersOf = async (documentId: string) =>
        Object.fromEntries(
          (
            await strapi.db.query(POST_UID).findMany({ where: { documentId }, populate: ['owner'] })
          ).map((entry) => [entry.locale, entry.owner?.documentId])
        );

      it('sets the owner on the locale an update adds', async () => {
        await grant(
          owned(`${POST_UID}.create`, POST_UID, 'owner'),
          owned(`${POST_UID}.update`, POST_UID, 'owner')
        );

        const documentId = await createPost(a.documentId);

        const res = await rq.put(`/api/posts/${documentId}`, {
          headers: bearer(a.token),
          qs: { locale: FRENCH },
          body: { data: { title: 'en français' } },
        });

        expect(res.statusCode).toBe(200);
        expect(await ownersOf(documentId)).toEqual({ en: a.documentId, [FRENCH]: a.documentId });

        // The owner is still not the body's to send
        const sneaky = await rq.put(`/api/posts/${documentId}`, {
          headers: bearer(a.token),
          qs: { locale: FRENCH },
          body: { data: { owner: { set: [{ documentId: b.documentId }] } } },
        });

        expect(sneaky.statusCode).toBe(400);
        expect(sneaky.body.error.details).toMatchObject({ key: 'owner' });
      });

      it("adds no locale whose version would not be the caller's: the write is rolled back", async () => {
        // No create row, so no owner is set on the version the update adds: it matches nobody
        await grant(owned(`${POST_UID}.update`, POST_UID, 'owner'));

        const documentId = await createPost(a.documentId);

        const res = await rq.put(`/api/posts/${documentId}`, {
          headers: bearer(a.token),
          qs: { locale: FRENCH },
          body: { data: { title: 'en français' } },
        });

        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual(NOT_FOUND);
        expect(await ownersOf(documentId)).toEqual({ en: a.documentId });
      });
    });

    describe('the locked fields', () => {
      it('answers 400 naming user to PUT /api/profiles/:id that sends a user, under the default grants', async () => {
        await resetRoles(strapi);

        const profile = await strapi
          .documents(PROFILE_UID)
          .findFirst({ filters: { user: { documentId: a.documentId } } });

        const res = await rq.put(`/api/profiles/${profile.documentId}`, {
          headers: bearer(a.token),
          body: { data: { user: { set: [{ documentId: b.documentId }] } } },
        });

        expect(res.statusCode).toBe(400);
        expect(res.body.error.name).toBe('ValidationError');
        expect(res.body.error.message).toContain('user');
        expect(res.body.error.details).toMatchObject({ key: 'user' });
      });
    });
  });

  describe('writes are judged', () => {
    /**
     * Authenticated in this describe: articles are read, and created and updated only with a title
     * that starts with "ok", checked on the data the write leaves behind.
     */
    const ONLY_OK = [{ name: TITLE_STARTS_OK.name }];
    const GRANTS = [
      unconditioned(`${ARTICLE_UID}.find`, ARTICLE_UID),
      unconditioned(`${ARTICLE_UID}.findOne`, ARTICLE_UID),
      row(`${ARTICLE_UID}.create`, ARTICLE_UID, {}, ONLY_OK),
      row(`${ARTICLE_UID}.update`, ARTICLE_UID, {}, ONLY_OK),
    ];

    let a: { token: string; documentId: string };
    let created;

    const articleCount = () => strapi.documents(ARTICLE_UID).count({});
    const storedTitle = async (documentId: string) =>
      (await strapi.documents(ARTICLE_UID).findOne({ documentId }))?.title;

    const post = (title: string) =>
      rq.post('/api/articles', { headers: bearer(a.token), body: { data: { title } } });

    // A real webhook for `entry.create`, to a receiver of this test: what the webhook runner sends
    const delivered: Array<{ event?: string; entry?: { title?: string } }> = [];
    const webhook = {
      id: 'judged-writes',
      name: 'judged-writes',
      url: '',
      headers: {},
      events: ['entry.create'],
      isEnabled: true,
    };
    let receiver: http.Server;

    const titles = () => delivered.map((payload) => payload.entry?.title);

    // Delivery is queued after the commit, so "nothing was sent" is shown by a later create that
    // is let through: once its webhook has arrived, one that a refused create queued earlier
    // would (in practice, deliveries leave in the order they were queued) be here too
    let markers = 0;
    const settle = async () => {
      markers += 1;

      const title = `ok-settled-${markers}`;

      expect((await post(title)).statusCode).toBe(201);
      await until(() => titles().includes(title), { what: `the webhook of "${title}"` });

      return title;
    };

    beforeAll(async () => {
      await reset();
      await grant(...GRANTS);

      a = await createSignedInUser(rq, 'judged-a@example.com');

      receiver = http.createServer((req, res) => {
        let body = '';

        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          delivered.push(JSON.parse(body));
          res.end('ok');
        });
      });
      await new Promise<void>((resolve) => {
        receiver.listen(0, '127.0.0.1', resolve);
      });
      webhook.url = `http://127.0.0.1:${(receiver.address() as AddressInfo).port}`;
      strapi.get('webhookRunner').add(webhook);
    });

    afterAll(async () => {
      strapi.get('webhookRunner').remove(webhook);
      await new Promise((resolve) => {
        receiver.close(resolve);
      });
    });

    beforeEach(() => {
      created = jest.fn();
      delivered.length = 0;
      strapi.eventHub.on('entry.create', created);
    });

    afterEach(() => {
      strapi.eventHub.off('entry.create', created);
    });

    it('refuses a create whose data the conditions do not match with 403, and writes nothing and emits no event', async () => {
      const before = await articleCount();

      const res = await post('nope');

      expect(res.statusCode).toBe(403);
      expect(res.body.error.message).toBe('This change is outside what your role allows.');
      expect(await articleCount()).toBe(before);
      expect(created).not.toHaveBeenCalled();
    });

    it('lets a create through when the data matches, and emits its event once committed', async () => {
      const res = await post('ok-1');

      expect(res.statusCode).toBe(201);
      expect(await storedTitle(res.body.data.documentId)).toBe('ok-1');
      expect(created).toHaveBeenCalled();
    });

    it('sends no webhook for a refused create, and one for a create that goes through', async () => {
      expect((await post('nope')).statusCode).toBe(403);
      const marker = await settle();

      expect(titles()).toEqual([marker]);

      expect((await post('ok-webhook')).statusCode).toBe(201);
      await until(() => titles().includes('ok-webhook'), { what: 'the webhook of "ok-webhook"' });
      expect(delivered.find((payload) => payload.entry?.title === 'ok-webhook')).toMatchObject({
        event: 'entry.create',
      });
    });

    it('refuses a create through GraphQL with FORBIDDEN, and writes nothing and emits no event', async () => {
      const before = await articleCount();

      const refused = await rq.post('/graphql', {
        headers: bearer(a.token),
        body: { query: 'mutation { createArticle(data: { title: "nope" }) { documentId } }' },
      });

      expect(refused.body.errors[0].extensions.code).toBe('FORBIDDEN');
      expect(await articleCount()).toBe(before);
      expect(created).not.toHaveBeenCalled();

      const fine = await rq.post('/graphql', {
        headers: bearer(a.token),
        body: {
          query: 'mutation { createArticle(data: { title: "ok-gql" }) { documentId title } }',
        },
      });

      expect(fine.body.errors).toBeUndefined();
      expect(fine.body.data.createArticle.title).toBe('ok-gql');
      expect(await articleCount()).toBe(before + 1);

      // Only what was let through was announced
      await settle();
      expect(titles()).not.toContain('nope');
    });

    it('refuses an update that leaves data outside the conditions, over REST and GraphQL, and leaves the entry as it was', async () => {
      const { documentId } = (await post('ok-2')).body.data;

      const put = await rq.put(`/api/articles/${documentId}`, {
        headers: bearer(a.token),
        body: { data: { title: 'nope' } },
      });

      expect(put.statusCode).toBe(403);
      expect(await storedTitle(documentId)).toBe('ok-2');

      const gql = await rq.post('/graphql', {
        headers: bearer(a.token),
        body: {
          query: `mutation { updateArticle(documentId: "${documentId}", data: { title: "nope" }) { documentId } }`,
        },
      });

      expect(gql.body.errors[0].extensions.code).toBe('FORBIDDEN');
      expect(await storedTitle(documentId)).toBe('ok-2');

      const fine = await rq.put(`/api/articles/${documentId}`, {
        headers: bearer(a.token),
        body: { data: { title: 'ok-3' } },
      });

      expect(fine.statusCode).toBe(200);
      expect(await storedTitle(documentId)).toBe('ok-3');
    });
  });

  describe('writes checked against the stored entry', () => {
    /**
     * Authenticated in this describe: update and delete of the caller's own notes, articles, posts
     * and board, and update of their own user.
     */
    const GRANTS = [
      owned(`${NOTE_UID}.update`, NOTE_UID, 'owner'),
      owned(`${NOTE_UID}.delete`, NOTE_UID, 'owner'),
      owned(`${ARTICLE_UID}.update`, ARTICLE_UID, 'author'),
      owned(`${ARTICLE_UID}.delete`, ARTICLE_UID, 'author'),
      // A create row says who owns what a translation adds: the stamp sets the owner of the version a
      // PUT creates, which the check of that version then finds to be the caller's
      owned(`${POST_UID}.create`, POST_UID, 'owner'),
      owned(`${POST_UID}.update`, POST_UID, 'owner'),
      owned(`${POST_UID}.delete`, POST_UID, 'owner'),
      owned(`${BOARD_UID}.update`, BOARD_UID, 'owner'),
      owned(`${BOARD_UID}.delete`, BOARD_UID, 'owner'),
      row(`${USER_UID}.update`, USER_UID, {}, [{ name: IS_SELF }]),
    ];

    let a: { token: string; documentId: string };
    let b: { token: string; documentId: string };

    const createNote = async (title: string, owner: string) =>
      (
        await strapi.documents(NOTE_UID).create({
          data: { title, owner: { connect: [{ documentId: owner }] } },
        })
      ).documentId as string;

    const noteTitle = async (documentId: string) =>
      (await strapi.documents(NOTE_UID).findOne({ documentId }))?.title;

    const profileOf = async (userDocumentId: string) => {
      const profile = await strapi
        .documents(PROFILE_UID)
        .findFirst({ filters: { user: { documentId: userDocumentId } } });

      if (!profile) {
        throw new Error(`no profile for ${userDocumentId}: every user is made with one`);
      }

      return profile;
    };

    /** The board, if there is one: a single type has at most one document */
    const storedBoard = () => strapi.db.query(BOARD_UID).findOne({ populate: { owner: true } });

    const setBoard = async (title: string, owner: string) => {
      await strapi.db.query(BOARD_UID).deleteMany({ where: {} });
      await strapi.documents(BOARD_UID).create({
        data: { title, owner: { connect: [{ documentId: owner }] } },
      });
    };

    /**
     * A post document with one entry per locale, each owned by the user given for it. The first
     * entry creates the document, the others join it.
     */
    const createPost = async (title: string, owners: Record<string, string>) => {
      let documentId: string | undefined;

      for (const [locale, owner] of Object.entries(owners)) {
        // eslint-disable-next-line no-await-in-loop
        const entry = await strapi.documents(POST_UID).create({
          locale,
          data: {
            ...(documentId === undefined ? {} : { documentId }),
            title: `${title} (${locale})`,
            owner: { connect: [{ documentId: owner }] },
          },
        });

        documentId = entry.documentId as string;
      }

      return documentId as string;
    };

    /** The locales the post has an entry in */
    const localesOf = async (documentId: string) =>
      (await strapi.db.query(POST_UID).findMany({ where: { documentId } }))
        .map((entry) => entry.locale as string)
        .sort();

    /** What is stored for an article: its draft and published version, with their authors */
    const versionsOfArticle = async (documentId: string) =>
      (await strapi.db.query(ARTICLE_UID).findMany({ where: { documentId }, populate: ['author'] }))
        .map((entry) => ({
          published: entry.publishedAt !== null,
          author: entry.author?.documentId as string | undefined,
        }))
        .sort((x, y) => Number(x.published) - Number(y.published));

    beforeAll(async () => {
      await reset();
      await grant(...GRANTS);

      a = await createSignedInUser(rq, 'writes-a@example.com');
      b = await createSignedInUser(rq, 'writes-b@example.com');
    });

    describe('a collection type', () => {
      it("answers 404 to PUT and DELETE on someone else's note, as it does for a note that is not there, and leaves it unchanged", async () => {
        const noteOfB = await createNote('note of b', b.documentId);

        const put = await rq.put(`/api/notes/${noteOfB}`, {
          headers: bearer(a.token),
          body: { data: { title: 'pwned' } },
        });

        expect(put.statusCode).toBe(404);
        // What `ctx.notFound()` sends, and what a document that doesn't exist gets: the two can't be
        // told apart
        expect(put.body).toEqual(NOT_FOUND);
        expect(await noteTitle(noteOfB)).toBe('note of b');

        const missingPut = await rq.put('/api/notes/no-such-document', {
          headers: bearer(a.token),
          body: { data: { title: 'pwned' } },
        });

        expect(missingPut.statusCode).toBe(404);
        expect(missingPut.body).toEqual(put.body);

        // A DELETE is a 404 too, not a silent 204
        const del = await rq.delete(`/api/notes/${noteOfB}`, { headers: bearer(a.token) });

        expect(del.statusCode).toBe(404);
        expect(del.body).toEqual(NOT_FOUND);
        expect(await noteTitle(noteOfB)).toBe('note of b');

        const missingDel = await rq.delete('/api/notes/no-such-document', {
          headers: bearer(a.token),
        });

        expect(missingDel.statusCode).toBe(404);
        expect(missingDel.body).toEqual(del.body);
      });

      it("updates and deletes the caller's own note", async () => {
        const noteOfA = await createNote('note of a', a.documentId);

        const put = await rq.put(`/api/notes/${noteOfA}`, {
          headers: bearer(a.token),
          body: { data: { title: 'renamed' } },
        });

        expect(put.statusCode).toBe(200);
        expect(await noteTitle(noteOfA)).toBe('renamed');

        const del = await rq.delete(`/api/notes/${noteOfA}`, { headers: bearer(a.token) });

        expect(del.statusCode).toBe(204);
        expect(await strapi.documents(NOTE_UID).findOne({ documentId: noteOfA })).toBeNull();
      });

      it("checks the draft of a draft & publish type: 404 on someone else's article", async () => {
        const create = (title: string, author: string) =>
          strapi.documents(ARTICLE_UID).create({
            data: { title, author: { connect: [{ documentId: author }] } },
          });
        const draftTitle = async (documentId: string) =>
          (await strapi.documents(ARTICLE_UID).findOne({ documentId, status: 'draft' }))?.title;

        const ofB = await create('article of b', b.documentId);
        const ofA = await create('article of a', a.documentId);

        const other = await rq.put(`/api/articles/${ofB.documentId}`, {
          headers: bearer(a.token),
          body: { data: { title: 'pwned' } },
        });

        expect(other.statusCode).toBe(404);
        expect(await draftTitle(ofB.documentId)).toBe('article of b');

        const own = await rq.put(`/api/articles/${ofA.documentId}`, {
          headers: bearer(a.token),
          body: { data: { title: 'edited' } },
        });

        expect(own.statusCode).toBe(200);
        expect(await draftTitle(ofA.documentId)).toBe('edited');
      });

      it("refuses a DELETE that would remove a published version that isn't the caller's, with the draft theirs", async () => {
        const { documentId } = await strapi.documents(ARTICLE_UID).create({
          status: 'published',
          data: { title: 'article', author: { connect: [{ documentId: b.documentId }] } },
        });

        // The draft is handed to A, the published version keeps naming B
        await strapi.documents(ARTICLE_UID).update({
          documentId,
          data: { author: { set: [{ documentId: a.documentId }] } },
        });

        expect(await versionsOfArticle(documentId)).toEqual([
          { published: false, author: a.documentId },
          { published: true, author: b.documentId },
        ]);

        const refused = await rq.delete(`/api/articles/${documentId}`, {
          headers: bearer(a.token),
        });

        expect(refused.statusCode).toBe(404);
        expect(refused.body).toEqual(NOT_FOUND);
        expect(await versionsOfArticle(documentId)).toHaveLength(2);

        // An update writes the draft, so the draft is what decides it. A holds no `publish` row, so
        // the PUT writes the draft and nothing more: B's published version, which a publish would
        // replace, is left as it was (the publish gate has it with publish rows too)
        const put = await rq.put(`/api/articles/${documentId}`, {
          headers: bearer(a.token),
          body: { data: { title: 'taken over' } },
        });

        expect(put.statusCode).toBe(200);
        expect(put.body.data.publishedAt).toBeNull();
        expect(await versionsOfArticle(documentId)).toEqual([
          { published: false, author: a.documentId },
          { published: true, author: b.documentId },
        ]);
        expect(
          (await strapi.documents(ARTICLE_UID).findOne({ documentId, status: 'published' })).title
        ).toBe('article');

        // Both versions are A's once the draft is published: the DELETE removes them
        await strapi.documents(ARTICLE_UID).publish({ documentId });

        expect(await versionsOfArticle(documentId)).toEqual([
          { published: false, author: a.documentId },
          { published: true, author: a.documentId },
        ]);

        const own = await rq.delete(`/api/articles/${documentId}`, { headers: bearer(a.token) });

        expect(own.statusCode).toBe(204);
        expect(await versionsOfArticle(documentId)).toEqual([]);
      });
    });

    describe('a localized collection type', () => {
      it("refuses a DELETE of every locale, or of a list of them, when one isn't the caller's, and deletes the locales in scope of the caller's own post, and only those", async () => {
        const post = await createPost('post', { en: a.documentId, [FRENCH]: b.documentId });

        for (const locale of ['*', ['en', FRENCH]]) {
          // eslint-disable-next-line no-await-in-loop
          const res = await rq.delete(`/api/posts/${post}`, {
            headers: bearer(a.token),
            qs: { locale },
          });

          expect(res.statusCode).toBe(404);
          expect(res.body).toEqual(NOT_FOUND);
        }

        expect(await localesOf(post)).toEqual(['en', FRENCH]);

        const own = await createPost('own', { en: a.documentId, [FRENCH]: a.documentId });
        const star = await rq.delete(`/api/posts/${own}`, {
          headers: bearer(a.token),
          qs: { locale: '*' },
        });

        expect(star.statusCode).toBe(204);
        expect(await localesOf(own)).toEqual([]);

        const listed = await createPost('listed', { en: a.documentId, [FRENCH]: a.documentId });
        const list = await rq.delete(`/api/posts/${listed}`, {
          headers: bearer(a.token),
          qs: { locale: ['en', FRENCH] },
        });

        expect(list.statusCode).toBe(204);
        expect(await localesOf(listed)).toEqual([]);

        // Without a locale the write is the default locale's alone, and so is the check: the French
        // entry is B's and stays, the English one is A's and goes
        const mixed = await createPost('mixed', { en: a.documentId, [FRENCH]: b.documentId });
        const single = await rq.delete(`/api/posts/${mixed}`, { headers: bearer(a.token) });

        expect(single.statusCode).toBe(204);
        expect(await localesOf(mixed)).toEqual([FRENCH]);
      });

      it("answers 404 to a PUT that adds a locale to someone else's post, or unless every entry of the document is the caller's, and adds it to the caller's own", async () => {
        const postOfB = await createPost('b', { en: b.documentId });
        const postOfA = await createPost('a', { en: a.documentId });

        const refused = await rq.put(`/api/posts/${postOfB}`, {
          headers: bearer(a.token),
          qs: { locale: FRENCH },
          body: { data: { title: 'pwned' } },
        });

        expect(refused.statusCode).toBe(404);
        expect(refused.body).toEqual(NOT_FOUND);
        expect(await localesOf(postOfB)).toEqual(['en']);

        const added = await rq.put(`/api/posts/${postOfA}`, {
          headers: bearer(a.token),
          qs: { locale: FRENCH },
          body: { data: { title: 'en français' } },
        });

        expect(added.statusCode).toBe(200);
        expect(await localesOf(postOfA)).toEqual(['en', FRENCH]);

        // The locale the document has is not a way in: A's English entry does not make B's French one
        // A's to write
        const postWithFrenchOfB = await createPost('mixed', {
          en: a.documentId,
          [FRENCH]: b.documentId,
        });
        const other = await rq.put(`/api/posts/${postWithFrenchOfB}`, {
          headers: bearer(a.token),
          qs: { locale: FRENCH },
          body: { data: { title: 'pwned' } },
        });

        expect(other.statusCode).toBe(404);

        // One entry is A's and another is B's, either way round: adding a locale copies from the
        // document, which is not all A's to write
        for (const post of [
          postWithFrenchOfB,
          await createPost('mixed the other way', { en: b.documentId, [FRENCH]: a.documentId }),
        ]) {
          // eslint-disable-next-line no-await-in-loop
          const notAll = await rq.put(`/api/posts/${post}`, {
            headers: bearer(a.token),
            qs: { locale: GERMAN },
            body: { data: { title: 'pwned' } },
          });

          expect(notAll.statusCode).toBe(404);
          expect(notAll.body).toEqual(NOT_FOUND);
          // eslint-disable-next-line no-await-in-loop
          expect(await localesOf(post)).toEqual(['en', FRENCH]);
        }

        const own = await createPost('own', { en: a.documentId, [FRENCH]: a.documentId });
        const addedGerman = await rq.put(`/api/posts/${own}`, {
          headers: bearer(a.token),
          qs: { locale: GERMAN },
          body: { data: { title: 'auf Deutsch' } },
        });

        expect(addedGerman.statusCode).toBe(200);
        expect(await localesOf(own)).toEqual(['de', 'en', FRENCH]);
      });
    });

    it("answers 404 to PUT /api/profiles/:id on someone else's profile and to PUT /api/users/:id on someone else's user", async () => {
      const profileOfB = await profileOf(b.documentId);
      const profileOfA = await profileOf(a.documentId);

      const other = await rq.put(`/api/profiles/${profileOfB.documentId}`, {
        headers: bearer(a.token),
        body: { data: {} },
      });

      expect(other.statusCode).toBe(404);
      expect((await profileOf(b.documentId)).updatedAt).toEqual(profileOfB.updatedAt);

      const own = await rq.put(`/api/profiles/${profileOfA.documentId}`, {
        headers: bearer(a.token),
        body: { data: {} },
      });

      expect(own.statusCode).toBe(200);

      const before = await strapi.documents(USER_UID).findOne({ documentId: b.documentId });
      const user = await rq.put(`/api/users/${b.documentId}`, {
        headers: bearer(a.token),
        body: { data: { name: 'pwned' } },
      });

      expect(user.statusCode).toBe(404);
      expect((await strapi.documents(USER_UID).findOne({ documentId: b.documentId })).name).toBe(
        before.name
      );
    });

    it('answers 400 to DELETE /api/profiles/:id from a role granted delete, and keeps the profile: a profile is deleted with its user', async () => {
      await grant(owned(`${PROFILE_UID}.delete`, PROFILE_UID, 'user'), ...GRANTS);

      try {
        const profile = await profileOf(a.documentId);

        const res = await rq.delete(`/api/profiles/${profile.documentId}`, {
          headers: bearer(a.token),
        });

        expect(res.statusCode).toBe(400);
        expect(res.body.error.message).toBe('A profile is created and deleted with its user');
        expect((await profileOf(a.documentId)).documentId).toBe(profile.documentId);
      } finally {
        await grant(...GRANTS);
      }
    });

    describe('a single type', () => {
      it("checks a single type's update and delete against its existing document", async () => {
        await setBoard('board of b', b.documentId);

        const put = await rq.put('/api/board', {
          headers: bearer(a.token),
          body: { data: { title: 'pwned' } },
        });
        const del = await rq.delete('/api/board', { headers: bearer(a.token) });

        expect(put.statusCode).toBe(404);
        expect(del.statusCode).toBe(404);
        expect(await storedBoard()).toMatchObject({
          title: 'board of b',
          owner: { documentId: b.documentId },
        });

        await setBoard('board of a', a.documentId);

        const ownPut = await rq.put('/api/board', {
          headers: bearer(a.token),
          body: { data: { title: 'renamed' } },
        });

        expect(ownPut.statusCode).toBe(200);
        expect((await storedBoard()).title).toBe('renamed');

        const ownDel = await rq.delete('/api/board', { headers: bearer(a.token) });

        expect(ownDel.statusCode).toBe(204);
        expect(await storedBoard()).toBeNull();
      });

      it('answers a DELETE with no document as it answers a refused one: 404, not a 204 that gives it away', async () => {
        await setBoard('board of b', b.documentId);

        const refused = await rq.delete('/api/board', { headers: bearer(a.token) });

        await strapi.db.query(BOARD_UID).deleteMany({ where: {} });

        const none = await rq.delete('/api/board', { headers: bearer(a.token) });

        expect(refused.statusCode).toBe(404);
        expect(refused.body).toEqual(NOT_FOUND);
        expect(none.statusCode).toBe(404);
        expect(none.body).toEqual(refused.body);
      });

      it('holds the document the first update creates to the update rows, once written', async () => {
        await strapi.db.query(BOARD_UID).deleteMany({ where: {} });

        // No create row: nothing stamps the owner, so the new document is no one's and is-owner
        // refuses it. The write is rolled back
        const unowned = await rq.put('/api/board', {
          headers: bearer(a.token),
          body: { data: { title: 'first' } },
        });

        expect(unowned.statusCode).toBe(404);
        expect(unowned.body).toEqual(NOT_FOUND);
        expect(await storedBoard()).toBeNull();

        // A create row stamps the creator as owner: the first PUT is theirs
        await grant(...GRANTS, owned(`${BOARD_UID}.create`, BOARD_UID, 'owner'));

        try {
          const res = await rq.put('/api/board', {
            headers: bearer(a.token),
            body: { data: { title: 'first' } },
          });

          expect(res.statusCode).toBe(200);
          expect((await storedBoard()).title).toBe('first');
          expect((await storedBoard()).owner.documentId).toBe(a.documentId);
        } finally {
          await grant(...GRANTS);
        }
      });
    });
  });

  describe('the user fields a write never sets', () => {
    /** The fields only Better Auth and the plugin write, with a value a body could send */
    const ENGINE_OWNED: Record<string, unknown> = {
      emailVerified: true,
      twoFactorEnabled: true,
      banned: true,
      banReason: 'spam',
      banExpires: '2030-01-01T00:00:00.000Z',
    };

    /** The identity fields `is-self` locks: Better Auth's own endpoints change them */
    const IDENTITY: Record<string, unknown> = {
      email: 'changed@example.com',
      username: 'changed',
    };

    /** `user.update` on every field of any user: nothing but the engine-owned rule stands in the way */
    const UPDATE_ANY_USER = unconditioned(`${USER_UID}.update`, USER_UID, { fields: null });

    /** `user.update` on every field of the caller's own user, through is-self */
    const UPDATE_SELF = row(`${USER_UID}.update`, USER_UID, { fields: null }, [{ name: IS_SELF }]);

    let users = 0;

    const signUp = () => {
      users += 1;

      return createSignedInUser(rq, `user-fields-${users}@example.com`);
    };

    const stored = (documentId: string) =>
      strapi.db.query(USER_UID).findOne({ where: { documentId } });

    const putUser = (token: string, documentId: string, data: Record<string, unknown>) =>
      rq.put(`/api/users/${documentId}`, { headers: bearer(token), body: { data } });

    beforeAll(async () => {
      await reset();
    });

    it('answers 400 naming the field to PUT /api/users/:id of a role with user.update and fields: null, and changes nothing', async () => {
      await grant(UPDATE_ANY_USER);

      for (const field of Object.keys(ENGINE_OWNED)) {
        // eslint-disable-next-line no-await-in-loop
        const me = await signUp();
        // eslint-disable-next-line no-await-in-loop
        const before = await stored(me.documentId);

        // eslint-disable-next-line no-await-in-loop
        const res = await putUser(me.token, me.documentId, {
          name: 'Renamed',
          [field]: ENGINE_OWNED[field],
        });

        expect({ field, status: res.statusCode }).toEqual({ field, status: 400 });
        expect(res.body.error).toMatchObject({
          name: 'ValidationError',
          message: `${field} can only be changed by the plugin`,
        });

        // eslint-disable-next-line no-await-in-loop
        const after = await stored(me.documentId);

        expect(after[field]).toEqual(before[field]);
        expect(after.name).toBe(before.name);
      }

      // The rest of the user goes through: the grant itself works
      const me = await signUp();
      const res = await putUser(me.token, me.documentId, { name: 'Renamed' });

      expect(res.statusCode).toBe(200);
      expect((await stored(me.documentId)).name).toBe('Renamed');
    });

    it('answers 400 naming email, which changes only through /change-email, and changes nothing', async () => {
      await grant(UPDATE_ANY_USER);

      const me = await signUp();
      const before = await stored(me.documentId);
      const res = await putUser(me.token, me.documentId, { email: 'elsewhere@example.com' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatchObject({ name: 'ValidationError' });
      expect(res.body.error.message).toContain('email');
      expect(res.body.error.message).toContain('/change-email');
      expect((await stored(me.documentId)).email).toBe(before.email);
    });

    it('answers 400 naming an identity or engine-owned field under is-self, and to a body that gives the caller roles', async () => {
      await grant(UPDATE_SELF);

      for (const [field, value] of Object.entries({ ...IDENTITY, ...ENGINE_OWNED })) {
        // eslint-disable-next-line no-await-in-loop
        const me = await signUp();
        // eslint-disable-next-line no-await-in-loop
        const before = await stored(me.documentId);

        // eslint-disable-next-line no-await-in-loop
        const res = await putUser(me.token, me.documentId, { [field]: value });

        expect({ field, status: res.statusCode }).toEqual({ field, status: 400 });
        expect(res.body.error.name).toBe('ValidationError');
        expect(res.body.error.message).toContain(field);
        // eslint-disable-next-line no-await-in-loop
        expect((await stored(me.documentId))[field]).toEqual(before[field]);
      }

      // The role type is not theirs to read
      const me = await signUp();
      const authenticated = await strapi.plugin('end-users').service('role').getDefault();

      const roles = await putUser(me.token, me.documentId, {
        roles: { connect: [authenticated.documentId] },
      });

      expect(roles.statusCode).toBe(400);
      expect(roles.body.error.name).toBe('ValidationError');
      expect(roles.body.error.message).toContain('roles');

      // The caller can change the rest of their own user
      const renamed = await putUser(me.token, me.documentId, { name: 'Self renamed' });

      expect(renamed.statusCode).toBe(200);
      expect((await stored(me.documentId)).name).toBe('Self renamed');
    });

    it('answers 400 naming roles to a user with user.update under is-self who PUTs their own user with roles in any form, and their roles stay unchanged', async () => {
      await grant(UPDATE_SELF);

      const me = await signUp();
      const authenticated = await strapi.plugin('end-users').service('role').getDefault();
      const rolesOf = async (documentId: string) =>
        (await strapi.documents(USER_UID).findOne({ documentId, populate: { roles: true } })).roles
          .map((role) => role.documentId)
          .sort();
      const before = await rolesOf(me.documentId);

      const forms = [
        [authenticated.documentId],
        { connect: [authenticated.documentId] },
        { set: [{ documentId: authenticated.documentId }] },
        { disconnect: [authenticated.documentId] },
        [],
      ];

      for (const roles of forms) {
        // eslint-disable-next-line no-await-in-loop
        const res = await putUser(me.token, me.documentId, { name: 'Renamed', roles });

        expect({ roles, status: res.statusCode }).toEqual({ roles, status: 400 });
        // Core's own input check answers first, in every form: `roles` is not a key a Content API
        // write may carry for this type. The plugin's validator ("roles can only be changed by the
        // plugin") is behind it, and its unit test covers its message
        expect(res.body.error).toMatchObject({
          name: 'ValidationError',
          message: 'Invalid key roles',
          details: { key: 'roles' },
        });
        // eslint-disable-next-line no-await-in-loop
        expect(await rolesOf(me.documentId)).toEqual(before);
      }

      expect((await stored(me.documentId)).name).not.toBe('Renamed');
    });

    it('stays editable in the Content Manager: an administrator marks an email verified', async () => {
      const me = await signUp();

      expect((await stored(me.documentId)).emailVerified).toBe(false);

      const res = await admin.put(
        `/content-manager/collection-types/${USER_UID}/${me.documentId}`,
        {
          body: { emailVerified: true },
        }
      );

      expect(res.statusCode).toBe(200);
      expect((await stored(me.documentId)).emailVerified).toBe(true);
    });
  });

  describe('explain mode', () => {
    const NOTE_FIELDS = ['title', 'body', 'owner', 'folder'];

    let a: { token: string; documentId: string };

    const get = (url: string, token: string | null = a.token) =>
      rq.get(url, token === null ? {} : { headers: bearer(token) });

    const explained = (res): Array<Record<string, unknown>> => JSON.parse(res.headers[HEADER]);

    /** Authenticated: the caller's own notes with every field but `secret`. Public: every note. */
    const grantNotes = () =>
      grant(owned(`${NOTE_UID}.find`, NOTE_UID, 'owner', { fields: NOTE_FIELDS }));

    beforeAll(async () => {
      await reset();
      await setRolePermissions(strapi, 'public', [
        unconditioned(`${NOTE_UID}.find`, NOTE_UID, { fields: NOTE_FIELDS }),
      ]);
      await grantNotes();

      a = await createSignedInUser(rq, 'explain-a@example.com');

      await strapi.documents(NOTE_UID).create({
        data: {
          title: 'first',
          body: 'text',
          secret: 'hidden',
          owner: { connect: [{ documentId: a.documentId }] },
        },
      });
    });

    it('names a stripped field and the condition that narrowed the list, with the role each came from and never a parameter, for a signed-in user and for Public', async () => {
      const res = await get('/api/notes');

      expect(res.statusCode).toBe(200);
      expect(explained(res)).toContainEqual(
        expect.objectContaining({
          kind: 'field-removed',
          uid: NOTE_UID,
          path: 'secret',
          roles: ['Authenticated'],
        })
      );
      expect(explained(res)).toContainEqual({
        kind: 'condition-applied',
        uid: NOTE_UID,
        action: 'find',
        at: 'root',
        conditions: [IS_OWNER],
        roles: ['Authenticated'],
      });
      expect(res.headers[HEADER]).not.toContain('params');

      const anonymous = await get('/api/notes', null);

      expect(anonymous.statusCode).toBe(200);
      expect(explained(anonymous)).toContainEqual(
        expect.objectContaining({ kind: 'field-removed', path: 'secret', roles: ['Public'] })
      );
    });

    it('adds meta.permissions with ?explain=true, the same as the header, and none without it', async () => {
      const res = await get('/api/notes?explain=true');

      expect(res.statusCode).toBe(200);
      expect(res.body.meta.permissions).toEqual(explained(res));
      expect(res.body.meta.pagination).toBeDefined();

      expect((await get('/api/notes')).body.meta.permissions).toBeUndefined();
    });

    it('marks a route that skipped the checks as route-only, and sends an empty list when the checks ran and changed nothing', async () => {
      const route = await get('/api/end-users/permissions/me');

      expect(route.statusCode).toBe(200);
      expect(explained(route)).toEqual([
        { kind: 'route-only', route: 'plugin::end-users.permissions.forCaller' },
      ]);

      // Unconditioned and every field: nothing to remove or narrow
      await grant(unconditioned(`${NOTE_UID}.find`, NOTE_UID));

      try {
        const res = await get('/api/notes');

        expect(res.statusCode).toBe(200);
        expect(explained(res).filter(({ kind }) => kind !== 'route-only')).toEqual([]);
      } finally {
        await grantNotes();
      }
    });

    it('sends nothing extra in production, logs the same entries at debug level, and sends the header again once autoReload is on', async () => {
      const set = (autoReload: boolean, explain: boolean) => {
        strapi.config.set('autoReload', autoReload);
        strapi.config.set('plugin::end-users.explain', explain);
      };
      const debug = jest.spyOn(strapi.log, 'debug');

      set(false, false);

      try {
        const res = await get('/api/notes?explain=true');

        expect(res.statusCode).toBe(200);
        expect(res.headers[HEADER]).toBeUndefined();
        expect(res.body.meta.permissions).toBeUndefined();
        expect(debug).toHaveBeenCalledWith(expect.stringContaining('"kind":"field-removed"'));

        strapi.config.set('autoReload', true);

        expect((await get('/api/notes')).headers[HEADER]).toBeDefined();
      } finally {
        debug.mockRestore();
        set(true, true);
      }
    });
  });

  describe('a condition on the profile', () => {
    it("shows the user only the articles of their profile's organization", async () => {
      await reset();
      await grant(row(`${ARTICLE_UID}.find`, ARTICLE_UID, {}, [{ name: IN_MY_ORGANIZATION.name }]));

      const [acme, other] = await Promise.all(
        ['Acme', 'Other'].map((name) =>
          strapi.documents(ORGANIZATION_UID).create({ data: { name } })
        )
      );
      const member = await createSignedInUser(rq, 'profile-member@example.com');
      const loner = await createSignedInUser(rq, 'profile-loner@example.com');

      const profile = await strapi
        .documents(PROFILE_UID)
        .findFirst({ filters: { user: { documentId: member.documentId } } });

      await strapi.documents(PROFILE_UID).update({
        documentId: profile.documentId,
        data: { organization: { connect: [{ documentId: acme.documentId }] } },
      });

      for (const [title, organization] of [
        ['acme article', acme],
        ['other article', other],
      ] as const) {
        // eslint-disable-next-line no-await-in-loop
        await strapi.documents(ARTICLE_UID).create({
          data: { title, organization: { connect: [{ documentId: organization.documentId }] } },
          status: 'published',
        });
      }

      const mine = await rq.get('/api/articles', { headers: bearer(member.token) });

      expect(mine.statusCode).toBe(200);
      expect(mine.body.data.map((article) => article.title)).toEqual(['acme article']);

      // No organization on the profile: the condition is false, so nothing is shown
      const none = await rq.get('/api/articles', { headers: bearer(loner.token) });

      expect(none.statusCode).toBe(200);
      expect(none.body.data).toEqual([]);
    });
  });

  describe('PUT /api/users/me/profile is judged like PUT /api/profiles/:id', () => {
    it('refuses with 403 an update whose data the profile update condition does not match, and leaves the profile as it was', async () => {
      await reset();
      await setRolePermissions(strapi, 'authenticated', [
        ...DEFAULT_AUTHENTICATED_PERMISSIONS.filter(
          ({ action }) => action !== `${PROFILE_UID}.update`
        ),
        row(`${PROFILE_UID}.update`, PROFILE_UID, {}, [{ name: OWN_PROFILE_NICKNAME_OK.name }]),
      ] as never);

      const me = await createSignedInUser(rq, 'judged-profile@example.com');
      const profile = await strapi
        .documents(PROFILE_UID)
        .findFirst({ filters: { user: { documentId: me.documentId } } });

      // Matches the condition as it is, so the update is the caller's to make
      await strapi
        .documents(PROFILE_UID)
        .update({ documentId: profile.documentId, data: { nickname: 'ok-1' } });

      const refused = await rq.put('/api/users/me/profile', {
        headers: bearer(me.token),
        body: { data: { nickname: 'nope' } },
      });

      expect(refused.statusCode).toBe(403);
      expect(refused.body.error.message).toBe('This change is outside what your role allows.');
      expect(
        (await strapi.documents(PROFILE_UID).findOne({ documentId: profile.documentId })).nickname
      ).toBe('ok-1');

      const fine = await rq.put('/api/users/me/profile', {
        headers: bearer(me.token),
        body: { data: { nickname: 'ok-2' } },
      });

      expect(fine.statusCode).toBe(200);
      expect(
        (await strapi.documents(PROFILE_UID).findOne({ documentId: profile.documentId })).nickname
      ).toBe('ok-2');
    });
  });

  describe('API tokens', () => {
    /**
     * An end user is held to the rules of the plugin and an API token is not: it keeps the
     * route-level permission it was created with, the whole of it, whatever the roles say.
     * Authenticated here hides `secret`, has `is-owner` on the notes' `find` and holds
     * neither `read-drafts` nor `publish`.
     */
    let a: { token: string; documentId: string };
    let b: { token: string; documentId: string };
    let noteB: { documentId: string };
    let readsDrafts: string;
    let readOnly: string;
    let fullAccess: string;

    beforeAll(async () => {
      await reset();
      await grant(
        owned(`${NOTE_UID}.find`, NOTE_UID, 'owner', { fields: ['title', 'body', 'owner'] }),
        unconditioned(`${ARTICLE_UID}.find`, ARTICLE_UID)
      );

      a = await createSignedInUser(rq, 'api-tokens-a@example.com');
      b = await createSignedInUser(rq, 'api-tokens-b@example.com');

      await strapi.documents(NOTE_UID).create({
        data: {
          title: 'note of a',
          body: 'text',
          secret: 'hidden a',
          owner: { connect: [{ documentId: a.documentId }] },
        },
      });
      noteB = await strapi.documents(NOTE_UID).create({
        data: {
          title: 'note of b',
          body: 'text',
          secret: 'hidden b',
          owner: { connect: [{ documentId: b.documentId }] },
        },
      });

      await strapi.documents(ARTICLE_UID).create({
        status: 'published',
        data: { title: 'published article', internalNotes: 'private notes' },
      });
      await strapi.documents(ARTICLE_UID).create({
        status: 'draft',
        data: { title: 'draft article', internalNotes: 'private notes' },
      });

      readsDrafts = await createToken({
        type: 'custom',
        permissions: ['api::article.article.find'],
      });
      readOnly = await createToken({ type: 'read-only' });
      fullAccess = await createToken({ type: 'full-access' });
    });

    it('lets a custom token with find read drafts with ?status=draft, and shows every field and every entry to a read-only token', async () => {
      const drafts = await as(readsDrafts).get('/articles?status=draft');

      expect(drafts.statusCode).toBe(200);
      // Every document has a draft, a published one too: the list is the drafts of all of them
      expect(drafts.body.data.every(({ publishedAt }) => publishedAt === null)).toBe(true);
      expect(drafts.body.data.map(({ title }) => title)).toEqual(
        expect.arrayContaining(['draft article', 'published article'])
      );
      expect(drafts.body.data.find(({ title }) => title === 'draft article').internalNotes).toBe(
        'private notes'
      );

      const notes = await as(readOnly).get('/notes');

      expect(notes.statusCode).toBe(200);
      expect(notes.body.data.map(({ title }) => title).sort()).toEqual(['note of a', 'note of b']);
      expect(notes.body.data.every(({ secret }) => typeof secret === 'string')).toBe(true);
    });

    it('publishes on create with a full-access token, stamps no owner on a note it creates and does not hold it to is-owner', async () => {
      const article = await as(fullAccess).post('/articles', {
        body: { data: { title: 'by token' } },
      });

      expect(article.statusCode).toBe(201);
      expect(article.body.data.publishedAt).not.toBeNull();

      const created = await as(fullAccess).post('/notes', {
        body: { data: { title: 'by token' } },
      });

      expect(created.statusCode).toBe(201);

      const stored = await strapi
        .documents(NOTE_UID)
        .findOne({ documentId: created.body.data.documentId, populate: ['owner'] });

      expect(stored.owner).toBeNull();

      // It updates any note, B's too
      const updated = await as(fullAccess).put(`/notes/${noteB.documentId}`, {
        body: { data: { title: 'changed by token' } },
      });

      expect(updated.statusCode).toBe(200);
      expect(updated.body.data.title).toBe('changed by token');
    });

    it('never sets the explain header for a token, though an end user gets it', async () => {
      for (const token of [readOnly, fullAccess, readsDrafts]) {
        // eslint-disable-next-line no-await-in-loop
        const res = await as(token).get('/articles?explain=true');

        expect(res.statusCode).toBe(200);
        expect(res.headers[HEADER]).toBeUndefined();
        expect(res.body.meta.permissions).toBeUndefined();
      }

      // The same request from an end user is explained: the configuration is on
      const user = await rq.get('/api/articles', { headers: bearer(a.token) });

      expect(user.headers[HEADER]).toBeDefined();
    });
  });
});
