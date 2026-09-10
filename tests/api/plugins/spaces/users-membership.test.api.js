'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const { createUtils } = require('api-tests/utils');

const SPACE_HEADER = 'X-Strapi-Space-Id';
const inSpace = (slug) => ({ [SPACE_HEADER]: slug });

/**
 * Users belong to workspaces: directly (the `spaces` binding on admin users)
 * or through their roles' bindings; a platform-wide role (no binding) means
 * everywhere, and super admins are members everywhere.
 */
describe('Spaces — users and workspaces', () => {
  let strapi;
  let rq;
  let utils;

  const roles = {};
  const users = {};
  const rqAs = {};
  let ghostId;

  const createUser = async (key, roleKeys) => {
    const user = await utils.createUser({
      email: `${key}@spaces.test`,
      firstname: key,
      lastname: 'Member',
      isActive: true,
      roles: roleKeys.map((roleKey) => roles[roleKey].id),
    });
    users[key] = user;
    rqAs[key] = await createAuthRequest({ strapi, userInfo: { email: user.email } });
    return user;
  };

  const createRole = async (key, spaces) => {
    const res = await rq({
      url: '/admin/roles',
      method: 'POST',
      body: { name: `membership-${key}`, description: key, spaces },
      headers: inSpace('default'),
    });
    expect(res.statusCode).toBe(201);
    roles[key] = res.body.data;
  };

  const emailsOf = (res) => res.body.data.results.map((user) => user.email).sort();

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
    utils = createUtils(strapi);

    // An interrupted run leaves the workspace behind, and its slug is unique.
    await strapi.db.query('plugin::spaces.space').deleteMany({ where: { slug: 'ghost' } });

    // Roles: one bound to acme, one bound to default, one platform-wide.
    await createRole('acme', ['acme']);
    await createRole('default', ['default']);
    await createRole('platform', []);

    await createUser('alice', ['platform']); // everywhere, through the platform-wide role
    await createUser('bob', ['acme']); // acme, through the bound role
    await createUser('carol', ['default']); // default through the role, acme by direct binding
    await createUser('dave', ['default']); // default only

    const bind = await rq({
      url: `/admin/users/${users.carol.id}`,
      method: 'PUT',
      body: { spaces: ['acme'] },
      headers: inSpace('default'),
    });
    expect(bind.statusCode).toBe(200);
  });

  afterAll(async () => {
    const created = await strapi.db.query('admin::user').findMany({
      where: { email: { $endsWith: '@spaces.test' } },
      select: ['id'],
    });
    await utils.deleteUsersById(created.map((user) => user.id));
    await strapi.db.query('admin::role').deleteMany({
      where: { name: { $startsWith: 'membership-' } },
    });
    await strapi.db.query('plugin::spaces.space').deleteMany({ where: { slug: 'ghost' } });
    await strapi.destroy();
  });

  describe('Who belongs where', () => {
    test('/spaces/mine lists the workspaces of the current user', async () => {
      const expectSpaces = async (key, slugs) => {
        const res = await rqAs[key]({ url: '/spaces/mine', method: 'GET' });
        expect(res.statusCode).toBe(200);
        expect(res.body.map((space) => space.slug)).toEqual(slugs);
      };

      await expectSpaces('alice', ['default', 'acme']);
      await expectSpaces('bob', ['acme']);
      await expectSpaces('carol', ['default', 'acme']);
      await expectSpaces('dave', ['default']);

      const superAdmin = await rq({ url: '/spaces/mine', method: 'GET' });
      expect(superAdmin.body.map((space) => space.slug)).toEqual(['default', 'acme']);
    });

    test('a sub-workspace lists its members only, with correct totals', async () => {
      const res = await rq({
        url: '/admin/users?pageSize=100',
        method: 'GET',
        headers: inSpace('acme'),
      });

      expect(res.statusCode).toBe(200);
      expect(emailsOf(res)).toEqual(
        expect.arrayContaining(['alice@spaces.test', 'bob@spaces.test', 'carol@spaces.test'])
      );
      expect(emailsOf(res)).not.toContain('dave@spaces.test');
      expect(res.body.data.pagination.total).toBe(res.body.data.results.length);
    });

    test('the default workspace lists everyone', async () => {
      const res = await rq({
        url: '/admin/users?pageSize=100',
        method: 'GET',
        headers: inSpace('default'),
      });

      expect(res.statusCode).toBe(200);
      expect(emailsOf(res)).toEqual(
        expect.arrayContaining([
          'alice@spaces.test',
          'bob@spaces.test',
          'carol@spaces.test',
          'dave@spaces.test',
        ])
      );
    });

    test('a non-member is a 404 in a sub-workspace, and deletions are refused there', async () => {
      const fromAcme = await rq({
        url: `/admin/users/${users.dave.id}`,
        method: 'GET',
        headers: inSpace('acme'),
      });
      const fromDefault = await rq({
        url: `/admin/users/${users.dave.id}`,
        method: 'GET',
        headers: inSpace('default'),
      });
      const remove = await rq({
        url: `/admin/users/${users.bob.id}`,
        method: 'DELETE',
        headers: inSpace('acme'),
      });

      expect(fromAcme.statusCode).toBe(404);
      expect(fromDefault.statusCode).toBe(200);
      expect(remove.statusCode).toBe(403);
    });

    test('a request carrying a workspace the user is not a member of is refused', async () => {
      const refused = await rqAs.dave({
        url: '/content-manager/content-types',
        method: 'GET',
        headers: inSpace('acme'),
      });
      const allowed = await rqAs.bob({
        url: '/content-manager/content-types',
        method: 'GET',
        headers: inSpace('acme'),
      });
      const selfService = await rqAs.dave({
        url: '/spaces/mine',
        method: 'GET',
        headers: inSpace('acme'),
      });

      expect(refused.statusCode).toBe(403);
      expect(allowed.statusCode).toBe(200);
      expect(selfService.statusCode).toBe(200);
    });

    test('the last-used workspace is remembered per user and validated', async () => {
      const before = await rqAs.alice({ url: '/spaces/mine/current', method: 'GET' });
      expect(before.body).toEqual({ slug: null });

      const set = await rqAs.alice({
        url: '/spaces/mine/current',
        method: 'PUT',
        body: { slug: 'acme' },
      });
      expect(set.statusCode).toBe(200);

      const after = await rqAs.alice({ url: '/spaces/mine/current', method: 'GET' });
      expect(after.body).toEqual({ slug: 'acme' });

      const notMember = await rqAs.dave({
        url: '/spaces/mine/current',
        method: 'PUT',
        body: { slug: 'acme' },
      });
      expect(notMember.statusCode).toBe(400);
    });

    test('bindings round-trip from default and are ignored from a sub-workspace', async () => {
      const detail = await rq({
        url: `/admin/users/${users.carol.id}`,
        method: 'GET',
        headers: inSpace('default'),
      });
      expect(detail.body.data.spaces).toEqual(['acme']);

      const ignored = await rq({
        url: `/admin/users/${users.bob.id}`,
        method: 'PUT',
        body: { firstname: 'Bobby', spaces: ['default'] },
        headers: inSpace('acme'),
      });
      expect(ignored.statusCode).toBe(200);
      expect(ignored.body.data.firstname).toBe('Bobby');

      const bob = await rq({
        url: `/admin/users/${users.bob.id}`,
        method: 'GET',
        headers: inSpace('default'),
      });
      expect(bob.body.data.spaces).toEqual([]);
    });
  });

  describe('Inviting from a sub-workspace', () => {
    test('a new email creates a pending account bound to the workspace', async () => {
      const res = await rq({
        url: '/admin/users',
        method: 'POST',
        body: {
          email: 'erin@spaces.test',
          firstname: 'Erin',
          lastname: 'New',
          roles: [roles.acme.id],
        },
        headers: inSpace('acme'),
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.registrationToken).toEqual(expect.any(String));

      const detail = await rq({
        url: `/admin/users/${res.body.data.id}`,
        method: 'GET',
        headers: inSpace('default'),
      });
      expect(detail.body.data.spaces).toEqual(['acme']);
    });

    test('an existing email adds the account to the workspace, roles merged, no duplicate', async () => {
      const res = await rq({
        url: '/admin/users',
        method: 'POST',
        body: {
          email: 'dave@spaces.test',
          firstname: 'Ignored',
          lastname: 'Ignored',
          roles: [roles.acme.id],
        },
        headers: inSpace('acme'),
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.id).toBe(users.dave.id);
      expect(res.body.data.addedToWorkspace).toBe('acme');
      expect(res.body.data.registrationToken).toBeUndefined();

      const accounts = await strapi.db.query('admin::user').count({
        where: { email: 'dave@spaces.test' },
      });
      expect(accounts).toBe(1);

      const dave = await rq({
        url: `/admin/users/${users.dave.id}`,
        method: 'GET',
        headers: inSpace('acme'),
      });
      expect(dave.statusCode).toBe(200);
      expect(dave.body.data.roles.map((role) => role.id).sort()).toEqual(
        [roles.default.id, roles.acme.id].sort()
      );

      const mine = await rqAs.dave({ url: '/spaces/mine', method: 'GET' });
      expect(mine.body.map((space) => space.slug)).toEqual(['default', 'acme']);
    });

    test('inviting someone who is already a member changes nothing', async () => {
      const res = await rq({
        url: '/admin/users',
        method: 'POST',
        body: { email: 'alice@spaces.test', firstname: 'Alice', roles: [roles.platform.id] },
        headers: inSpace('acme'),
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.id).toBe(users.alice.id);

      const alice = await rq({
        url: `/admin/users/${users.alice.id}`,
        method: 'GET',
        headers: inSpace('default'),
      });
      expect(alice.body.data.roles.map((role) => role.id)).toEqual([roles.platform.id]);
    });
  });
  /**
   * Archiving a workspace takes its members' only membership away when they
   * hold nothing else. They keep their account and their roles, so this is a
   * recoverable state — but until someone puts them back, every workspace-aware
   * request is refused, and the switcher says so instead of leaving them on a
   * blank screen.
   */
  describe('A user left with no workspace', () => {
    // Created here, not with the other fixtures: an extra workspace would show
    // up in every membership answer above.
    beforeAll(async () => {
      const ghost = await rq({
        url: '/spaces',
        method: 'POST',
        body: { slug: 'ghost', name: 'Ghost', color: '#ABCDEF' },
        headers: inSpace('default'),
      });
      expect([200, 201]).toContain(ghost.statusCode);
      ghostId = ghost.body.id ?? ghost.body.data?.id;
      expect(ghostId).toBeDefined();

      await createRole('ghost', ['ghost']);
      await createUser('frank', ['ghost']);
    });

    test('belongs to the workspace their role is bound to', async () => {
      const mine = await rqAs.frank({ url: '/spaces/mine', method: 'GET' });
      expect(mine.body.map((space) => space.slug)).toEqual(['ghost']);
    });

    test('archiving it leaves them with none, and the admin refuses every workspace', async () => {
      const archived = await rq({
        url: `/spaces/${ghostId}`,
        method: 'PUT',
        body: { status: 'archived' },
        headers: inSpace('default'),
      });
      expect(archived.statusCode).toBe(200);

      const mine = await rqAs.frank({ url: '/spaces/mine', method: 'GET' });
      expect(mine.statusCode).toBe(200);
      expect(mine.body).toEqual([]);

      const read = (slug) =>
        rqAs.frank({
          url: '/content-manager/collection-types/api::article.article',
          method: 'GET',
          headers: inSpace(slug),
        });

      // Not even the default workspace, which is the widest view of all.
      expect((await read('default')).statusCode).toBe(403);
      // And the archived one is not a workspace anyone can ask for any more.
      expect((await read('ghost')).statusCode).toBe(400);
    });
  });
});
