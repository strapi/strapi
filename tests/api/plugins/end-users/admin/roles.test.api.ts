import fs from 'node:fs';
import path from 'node:path';
import { createAuthRequest, createRequest } from 'api-tests/request';
import { createUtils } from 'api-tests/utils';

import { createEndUsersInstance } from '../utils/create-end-users-instance';
import { createFixtureBuilder } from '../utils/fixtures';
import { row, setRolePermissions } from '../utils/permissions';

const USER_UID = 'plugin::end-users.user';
const ROLE_UID = 'plugin::end-users.role';
const PERMISSION_UID = 'plugin::end-users.permission';

const READ_ACTION = 'plugin::end-users.roles.read';
const CONDITIONS_READ_ACTION = 'plugin::end-users.conditions.read';
const CONTENT_MANAGER_READ = 'plugin::content-manager.explorer.read';
const PASSWORD = 'Password123';

describe('end-users: admin API', () => {
  let strapi;
  let roles;
  let permissions;
  let utils;
  let rqAdmin;
  let rqAuthor;
  let rqReader;
  let someRole;
  const adminUserIds: number[] = [];
  const adminRoleIds: number[] = [];

  const makeUser = (email: string, extra: Record<string, unknown> = {}) =>
    strapi
      .documents(USER_UID)
      .create({ data: { name: 'Test', email, emailVerified: false, ...extra } });

  const rolesOf = async (userDocumentId: string) =>
    (await strapi.documents(USER_UID).findOne({ documentId: userDocumentId, populate: ['roles'] }))
      .roles;

  const roleOfType = (type: string) => strapi.documents(ROLE_UID).findFirst({ filters: { type } });

  /** What an editor loaded, and sends back: roles from before the column have none, which is 0. */
  const revisionOf = async (documentId: string): Promise<number> =>
    (await roles.get(documentId)).revision;

  /** Rows an admin may save: actions of the routes this instance has (`me.find`, the profile's). */
  const ME = 'plugin::end-users.me.find';
  const PROFILE_FIND = 'plugin::end-users.profile.find';
  const PROFILE_FIND_ONE = 'plugin::end-users.profile.findOne';
  const PROFILE_UPDATE = 'plugin::end-users.profile.update';
  const PROFILE_DELETE = 'plugin::end-users.profile.delete';

  const emptyCustomRoles = async () => {
    await strapi.db.query(PERMISSION_UID).deleteMany({ where: { role: { type: 'custom' } } });
    await strapi.db.query(ROLE_UID).deleteMany({ where: { type: 'custom' } });
  };

  const emptyUsers = () => strapi.db.query(USER_UID).deleteMany({ where: {} });

  /**
   * The answers to these requests, one after the other. A request is sent when it is awaited, so
   * this is what keeps writes from overlapping on the test database's single connection.
   */
  const sequentially = async (requests: Array<PromiseLike<{ status: number }>>) => {
    const answers: Array<{ status: number }> = [];

    for (const request of requests) {
      // eslint-disable-next-line no-await-in-loop
      answers.push(await request);
    }

    return answers;
  };

  const asKeys = (permissionRows: Array<{ action: string; subject: string | null }>) =>
    permissionRows.map(({ action, subject }) => `${action}|${subject}`).sort();

  const createAdminUser = async (email: string, adminRoleId: number) => {
    const user = await utils.createUser({
      email,
      firstname: 'End users',
      lastname: 'Admin',
      password: PASSWORD,
      isActive: true,
      roles: [adminRoleId],
    });

    adminUserIds.push(user.id);

    return createAuthRequest({ strapi, userInfo: { email, password: PASSWORD } });
  };

  beforeAll(async () => {
    // The fixture types: the builder layout test reads `api::article.article` and its `author`
    strapi = await createEndUsersInstance({ builder: createFixtureBuilder() });
    roles = strapi.plugin('end-users').service('role');
    permissions = strapi.plugin('end-users').service('permission');
    utils = createUtils(strapi);

    await emptyUsers();
    await emptyCustomRoles();

    rqAdmin = await createAuthRequest({ strapi });

    // An Author does not hold any of the end-users actions
    const [authorRole] = await utils.getRole({ code: 'strapi-author' });
    rqAuthor = await createAdminUser('end-users-author@example.com', authorRole.id);

    // An admin who may read roles, and nothing else of the plugin
    const readerRole = await utils.createRole({
      name: 'End users role reader',
      description: 'Holds plugin::end-users.roles.read only',
    });
    adminRoleIds.push(readerRole.id);
    await utils.assignPermissionsToRole(readerRole.id, [
      { action: READ_ACTION, subject: null, conditions: [], properties: {} },
    ]);
    rqReader = await createAdminUser('end-users-reader@example.com', readerRole.id);

    someRole = await roles.create({ name: 'Guarded', permissions: [row(ME)] });
  });

  afterAll(async () => {
    await emptyUsers();
    await emptyCustomRoles();

    if (adminUserIds.length > 0) {
      await utils.deleteUsersById(adminUserIds);
    }

    if (adminRoleIds.length > 0) {
      await utils.deleteRolesById(adminRoleIds);
    }

    await strapi.destroy();
  });

  describe('the admin RBAC actions', () => {
    it('needs a token and the action of each route: an Author gets 403 on every route, and a role with only roles.read reads and cannot change or export-import', async () => {
      const base = `/end-users/roles/${someRole.documentId}`;
      const layout = '/end-users/permissions/layout';
      const bound = '/end-users/permissions/routes';

      expect((await createRequest({ strapi }).get('/end-users/roles')).status).toBe(401);

      const author = await sequentially([
        rqAuthor.get('/end-users/roles'),
        rqAuthor.post('/end-users/roles', { body: { name: 'Nope' } }),
        rqAuthor.get(base),
        rqAuthor.put(base, { body: { name: 'Nope' } }),
        rqAuthor.delete(base),
        rqAuthor.get(`${base}/export`),
        rqAuthor.post('/end-users/roles/import', { body: { version: 1 } }),
        rqAuthor.get(layout),
        rqAuthor.get(bound, { qs: { subject: USER_UID } }),
        // The conditions routes: the list, the status, the builder layout, the preview and the builder's three writes
        rqAuthor.get('/end-users/conditions'),
        rqAuthor.get('/end-users/conditions/status'),
        rqAuthor.get('/end-users/conditions/builder-layout'),
        rqAuthor.post('/end-users/conditions/preview', { body: {} }),
        rqAuthor.post('/end-users/conditions', { body: { slug: 'nope' } }),
        rqAuthor.put('/end-users/conditions/nope', { body: { slug: 'nope' } }),
        rqAuthor.delete('/end-users/conditions/nope'),
      ]);

      expect(author.map((answer) => answer.status)).toEqual([
        403, 403, 403, 403, 403, 403, 403, 403, 403, 403, 403, 403, 403, 403, 403, 403,
      ]);
      expect(await strapi.documents(ROLE_UID).count({ filters: { name: 'Nope' } })).toBe(0);

      // The layout routes take any one of roles.read and conditions.read
      const allowed = await sequentially([
        rqReader.get('/end-users/roles'),
        rqReader.get(base),
        rqReader.get(`${base}/export`),
        rqReader.get(layout),
        rqReader.get(bound, { qs: { subject: USER_UID } }),
      ]);
      const refused = await sequentially([
        rqReader.post('/end-users/roles', { body: { name: 'Nope' } }),
        rqReader.post('/end-users/roles/import', { body: { version: 1 } }),
        rqReader.put(base, { body: { name: 'Nope' } }),
        rqReader.delete(base),
      ]);

      expect(allowed.map((answer) => answer.status)).toEqual([200, 200, 200, 200, 200]);
      expect(refused.map((answer) => answer.status)).toEqual([403, 403, 403, 403]);
      expect((await roles.get(someRole.documentId)).name).toBe('Guarded');
    });
  });

  describe('listing and reading', () => {
    it('lists roles with user counts', async () => {
      const staff = await roles.create({ name: 'Counted over HTTP' });

      await makeUser('counted-http-one@example.com', { roles: { connect: [staff.documentId] } });
      await makeUser('counted-http-two@example.com', { roles: { connect: [staff.documentId] } });

      const res = await rqAdmin.get('/end-users/roles');

      expect(res.status).toBe(200);

      const list = res.body.data;

      expect(list.map(({ type }) => type)).toEqual(
        expect.arrayContaining(['public', 'authenticated', 'custom'])
      );
      expect(list.find(({ name }) => name === 'Counted over HTTP')).toMatchObject({
        documentId: staff.documentId,
        type: 'custom',
        usersCount: 2,
      });
      expect(list.find(({ type }) => type === 'public')).toMatchObject({
        name: 'Public',
        usersCount: 0,
      });

      // The role is named by its documentId, never its database id
      for (const role of list) {
        expect(role).not.toHaveProperty('id');
      }
    });

    it('reads one role with its permissions, and answers 404 to every route for a role that does not exist', async () => {
      const res = await rqAdmin.get(`/end-users/roles/${someRole.documentId}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ documentId: someRole.documentId, name: 'Guarded' });
      expect(res.body.data.permissions.map(({ action }) => action)).toEqual([ME]);
      expect(res.body.data).not.toHaveProperty('id');

      const answers = await sequentially([
        rqAdmin.get('/end-users/roles/doesnotexist'),
        rqAdmin.get('/end-users/roles/doesnotexist/export'),
        rqAdmin.put('/end-users/roles/doesnotexist', { body: { name: 'Nobody' } }),
        rqAdmin.delete('/end-users/roles/doesnotexist'),
      ]);

      expect(answers.map((answer) => answer.status)).toEqual([404, 404, 404, 404]);
    });
  });

  describe('creating', () => {
    it('creates a custom role with its permissions and answers 201, whatever type the body says', async () => {
      const res = await rqAdmin.post('/end-users/roles', {
        body: {
          name: 'Created over HTTP',
          description: 'Made by an admin',
          requireTwoFactor: true,
          permissions: [row(ME), row(PROFILE_FIND)],
        },
      });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        name: 'Created over HTTP',
        description: 'Made by an admin',
        type: 'custom',
        requireTwoFactor: true,
      });
      expect(res.body.data.permissions.map(({ action }) => action).sort()).toEqual(
        [ME, PROFILE_FIND].sort()
      );

      const pretender = await rqAdmin.post('/end-users/roles', {
        body: { name: 'Pretender over HTTP', type: 'public' },
      });

      expect(pretender.status).toBe(201);
      expect(pretender.body.data.type).toBe('custom');
      expect(await strapi.documents(ROLE_UID).count({ filters: { type: 'public' } })).toBe(1);
    });

    it('refuses a second role with the same name, a role with no name, and a bad permission', async () => {
      await rqAdmin.post('/end-users/roles', { body: { name: 'Twice over HTTP' } });

      const answers = await sequentially([
        rqAdmin.post('/end-users/roles', { body: { name: 'Twice over HTTP' } }),
        rqAdmin.post('/end-users/roles', { body: { description: 'No name' } }),
        rqAdmin.post('/end-users/roles', {
          body: { name: 'Broken over HTTP', permissions: [row(ME), { action: '' }] },
        }),
      ]);

      expect(answers.map((answer) => answer.status)).toEqual([400, 400, 400]);
      expect(
        await strapi.documents(ROLE_UID).count({ filters: { name: 'Broken over HTTP' } })
      ).toBe(0);
    });
  });

  describe('updating', () => {
    it('keeps the permissions when an update omits them, and when the diff is empty', async () => {
      const role = await roles.create({
        name: 'Keeps',
        permissions: [row(ME), row(PROFILE_FIND)],
      });

      const renamed = await rqAdmin.put(`/end-users/roles/${role.documentId}`, {
        body: { revision: role.revision, name: 'Renamed' },
      });

      expect(renamed.status).toBe(200);
      expect(renamed.body.data.name).toBe('Renamed');
      expect(renamed.body.data.permissions).toHaveLength(2);
      expect((await permissions.findForRoles([role.documentId])).length).toBe(2);

      const empty = await rqAdmin.put(`/end-users/roles/${role.documentId}`, {
        body: {
          revision: renamed.body.data.revision,
          permissions: { create: [], update: [], delete: [] },
        },
      });

      expect(empty.status).toBe(200);
      expect(empty.body.data.permissions).toHaveLength(2);
    });

    it('applies a permissions diff: creates, updates and deletes by documentId', async () => {
      const role = await roles.create({
        name: 'Diffed over HTTP',
        permissions: [row(PROFILE_FIND), row(PROFILE_FIND_ONE), row(PROFILE_DELETE)],
      });
      const byAction = Object.fromEntries(
        role.permissions.map((permission) => [permission.action, permission.documentId])
      );

      const res = await rqAdmin.put(`/end-users/roles/${role.documentId}`, {
        body: {
          revision: role.revision,
          description: 'Changed',
          requireTwoFactor: true,
          permissions: {
            create: [row(ME)],
            update: [{ documentId: byAction[PROFILE_FIND_ONE], action: PROFILE_UPDATE }],
            delete: [byAction[PROFILE_DELETE]],
          },
        },
      });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        description: 'Changed',
        requireTwoFactor: true,
        // Every save moves the revision on
        revision: role.revision + 1,
        problems: [],
      });
      expect(res.body.data.permissions.map(({ action }) => action).sort()).toEqual(
        [PROFILE_FIND, PROFILE_UPDATE, ME].sort()
      );
    });

    it('does not change the role type', async () => {
      const authenticated = await roleOfType('authenticated');

      const res = await rqAdmin.put(`/end-users/roles/${authenticated.documentId}`, {
        body: {
          revision: await revisionOf(authenticated.documentId),
          description: 'Signed-in users',
          type: 'custom',
        },
      });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        type: 'authenticated',
        description: 'Signed-in users',
      });
    });

    it('refuses permissions that are not a diff, and a name another role has, and changes nothing', async () => {
      const role = await roles.create({ name: 'Not a diff', permissions: [row(ME)] });
      const wanted = await roles.create({ name: 'Name wanted' });
      const { revision } = role;

      const answers = await sequentially([
        rqAdmin.put(`/end-users/roles/${role.documentId}`, {
          body: { revision, name: 'Changed', permissions: [row(PROFILE_FIND)] },
        }),
        rqAdmin.put(`/end-users/roles/${role.documentId}`, {
          body: { revision, name: 'Changed', permissions: { replace: [] } },
        }),
        rqAdmin.put(`/end-users/roles/${role.documentId}`, {
          body: { revision, name: 'Changed', permissions: { create: row(PROFILE_FIND) } },
        }),
        // A name another role has
        rqAdmin.put(`/end-users/roles/${wanted.documentId}`, {
          body: { revision: wanted.revision, name: 'Not a diff' },
        }),
      ]);

      expect(answers.map((answer) => answer.status)).toEqual([400, 400, 400, 400]);

      const after = await roles.get(role.documentId);

      expect(after.name).toBe('Not a diff');
      expect(after.permissions.map(({ action }) => action)).toEqual([ME]);
      // Refused saves leave the revision where it was, the refusal after the revision step included
      expect(after.revision).toBe(revision);
      expect(await roles.get(wanted.documentId)).toMatchObject({
        name: 'Name wanted',
        revision: wanted.revision,
      });
    });

    it('answers 409 for a stale revision and 400 naming the row for an unknown action', async () => {
      const role = await roles.create({ name: 'Versioned', permissions: [row(ME)] });
      const url = `/end-users/roles/${role.documentId}`;

      const first = await rqAdmin.put(url, {
        body: { revision: role.revision, name: 'Versioned once' },
      });

      expect(first.status).toBe(200);
      expect(first.body.data.revision).toBe(role.revision + 1);

      // Built on the copy from before that save: it changes nothing, whatever it carries
      const stale = await rqAdmin.put(url, {
        body: {
          revision: role.revision,
          name: 'Versioned twice',
          permissions: { create: [row(PROFILE_FIND)], update: [], delete: [] },
        },
      });

      expect(stale.status).toBe(409);
      expect(stale.body.error.details.code).toBe('ROLE_CHANGED');

      const after = await roles.get(role.documentId);

      expect(after.name).toBe('Versioned once');
      expect(after.permissions.map(({ action }) => action)).toEqual([ME]);
      expect(after.revision).toBe(first.body.data.revision);

      // A save with no revision is not one that can be told from a stale one
      const missing = await rqAdmin.put(url, { body: { name: 'No revision' } });

      expect(missing.status).toBe(400);

      // A row of the diff that no route of this installation has is named, and nothing moves on
      const unknown = await rqAdmin.put(url, {
        body: {
          revision: first.body.data.revision,
          permissions: {
            create: [row(PROFILE_FIND), row('api::nope.nope.find')],
            update: [],
            delete: [],
          },
        },
      });

      expect(unknown.status).toBe(400);
      expect(unknown.body.error.message).toMatch(/^Permission 1 \(api::nope\.nope\.find\): /);
      expect(unknown.body.error.details.errors[0].path).toEqual([
        'permissions',
        'create',
        1,
        'action',
      ]);
      expect(await revisionOf(role.documentId)).toBe(first.body.data.revision);
      expect((await roles.get(role.documentId)).permissions.map(({ action }) => action)).toEqual([
        ME,
      ]);
    });
  });

  describe('deleting', () => {
    it('deletes a role its users hold, keeping their other roles', async () => {
      const premium = await roles.create({ name: 'Premium over HTTP' });
      const editor = await roles.create({ name: 'Editor over HTTP' });
      const authenticated = await roleOfType('authenticated');
      const both = await makeUser('both-roles-http@example.com', {
        roles: { connect: [premium.documentId, editor.documentId] },
      });
      const only = await makeUser('premium-only-http@example.com', {
        roles: { connect: [premium.documentId] },
      });

      // There is no replacement to name any more: a reassignTo is refused, and nothing is deleted
      const refused = await rqAdmin.delete(`/end-users/roles/${premium.documentId}`, {
        qs: { reassignTo: editor.documentId },
      });

      expect(refused.status).toBe(400);
      expect(
        await strapi.documents(ROLE_UID).findOne({ documentId: premium.documentId })
      ).not.toBeNull();

      const res = await rqAdmin.delete(`/end-users/roles/${premium.documentId}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ documentId: premium.documentId, movedToDefault: 1 });
      expect(
        await strapi.documents(ROLE_UID).findOne({ documentId: premium.documentId })
      ).toBeNull();
      // The user with two roles keeps the other; the one left with none has the default role
      expect((await rolesOf(both.documentId)).map((held) => held.documentId)).toEqual([
        editor.documentId,
      ]);
      expect((await rolesOf(only.documentId)).map((held) => held.documentId)).toEqual([
        authenticated.documentId,
      ]);
    });

    it('refuses to delete Public or Authenticated, and deletes a role nobody holds with its permissions', async () => {
      const publicRole = await roleOfType('public');
      const authenticated = await roleOfType('authenticated');

      const refused = await sequentially([
        rqAdmin.delete(`/end-users/roles/${publicRole.documentId}`),
        rqAdmin.delete(`/end-users/roles/${authenticated.documentId}`),
      ]);

      expect(refused.map((answer) => answer.status)).toEqual([400, 400]);
      expect(
        await strapi
          .documents(ROLE_UID)
          .count({ filters: { type: { $in: ['public', 'authenticated'] } } })
      ).toBe(2);

      const role = await roles.create({
        name: 'Short lived over HTTP',
        permissions: [row(ME)],
      });
      const rowsBefore = await strapi.db.query(PERMISSION_UID).count({});

      const res = await rqAdmin.delete(`/end-users/roles/${role.documentId}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ documentId: role.documentId, movedToDefault: 0 });
      expect(await strapi.documents(ROLE_UID).findOne({ documentId: role.documentId })).toBeNull();
      // Its one permission went with it
      expect(await strapi.db.query(PERMISSION_UID).count({})).toBe(rowsBefore - 1);
    });
  });

  describe('the permission layout', () => {
    it('serves the layout and the routes bound to a content type or a route group', async () => {
      const layout = await rqAdmin.get('/end-users/permissions/layout');

      expect(layout.status).toBe(200);
      expect(Array.isArray(layout.body.data.contentTypes)).toBe(true);
      expect(Array.isArray(layout.body.data.groups)).toBe(true);

      const uids = layout.body.data.contentTypes.map(({ uid }) => uid);

      // The user and its profile are offered; the engine's tables are not
      expect(uids).toEqual(expect.arrayContaining([USER_UID, 'plugin::end-users.profile']));
      expect(uids).not.toContain('plugin::end-users.session');

      // The role type is offered for reading through the user's `roles`: Find, and nothing else
      const roleType = layout.body.data.contentTypes.find(({ uid }) => uid === ROLE_UID);

      expect(roleType.actions.map(({ action }) => action)).toEqual(['find']);
      expect(layout.body.data.groups.map(({ id }) => id)).toContain('plugin::end-users');

      const bound = await rqAdmin.get('/end-users/permissions/routes', {
        qs: { subject: USER_UID },
      });

      expect(bound.status).toBe(200);
      expect(bound.body.data).toEqual(
        expect.arrayContaining([
          { actionId: `${USER_UID}.find`, method: 'GET', path: '/api/users', rules: [] },
        ])
      );

      const group = await rqAdmin.get('/end-users/permissions/routes', {
        qs: { subject: 'plugin::end-users' },
      });

      expect(group.status).toBe(200);
      expect(group.body.data.map(({ actionId }) => actionId)).toContain(
        'plugin::end-users.me.find'
      );

      // Not a content type or group of the layout, and not one string
      const refused = await sequentially([
        rqAdmin.get('/end-users/permissions/routes', { qs: { subject: 'api::nope.nope' } }),
        rqAdmin.get('/end-users/permissions/routes', { qs: { subject: ['a', 'b'] } }),
        rqAdmin.get('/end-users/permissions/routes'),
      ]);

      expect(refused.map((answer) => answer.status)).toEqual([404, 400, 400]);
    });
  });

  describe('conditions', () => {
    /** A version 2 condition on the end-user type: the harness has no fixture types, and the builder offers it */
    const check = (path: string[], operator: string, value: object) => ({
      kind: 'check',
      target: { path },
      operator,
      value,
    });
    const builderFile = (slug: string, items: object[], extra: object = {}) => ({
      version: 2,
      slug,
      displayName: slug,
      appliesTo: { kind: 'types', types: [USER_UID] },
      inputs: [],
      who: { match: 'all', checks: [] },
      which: { kind: 'group', match: 'all', items },
      onSave: { stamp: [], locked: [] },
      ...extra,
    });
    const verifiedCondition = builderFile('verified', [
      check(['emailVerified'], '$eq', { kind: 'fixed', value: true }),
    ]);

    const previewOf = (
      request: typeof rqAdmin,
      condition: object,
      userDocumentId: string,
      inputs: object = {}
    ) =>
      request.post('/end-users/conditions/preview', {
        body: { condition, subject: USER_UID, userDocumentId, inputs },
      });

    it('lists, previews and refuses builder writes outside development', async () => {
      const list = await rqAdmin.get('/end-users/conditions');

      expect(list.status).toBe(200);
      expect(
        list.body.data.find(({ name }) => name === 'plugin::end-users.is-owner')
      ).toMatchObject({ source: 'builtin', editable: false, usedBy: expect.any(Number) });

      const sample = await makeUser('conditions-preview-verified@example.com', {
        emailVerified: true,
      });
      await makeUser('conditions-preview-unverified@example.com');

      const preview = await previewOf(rqAdmin, verifiedCondition, sample.documentId);

      expect(preview.status).toBe(200);
      expect(preview.body.data).toEqual({
        matching: await strapi.documents(USER_UID).count({ filters: { emailVerified: true } }),
        total: await strapi.documents(USER_UID).count({}),
      });

      // An admin who may change conditions still may not outside development. The harness runs with
      // autoReload on, as `strapi develop` does, so it is turned off for these three requests, as
      // under `strapi start`, and back on after them. Nothing is written, and the status says no
      // write waits
      const autoReload = strapi.config.get('autoReload');
      let writes: Array<{ status: number }>;

      strapi.config.set('autoReload', false);

      try {
        writes = await sequentially([
          rqAdmin.post('/end-users/conditions', { body: verifiedCondition }),
          rqAdmin.put('/end-users/conditions/verified', { body: verifiedCondition }),
          rqAdmin.delete('/end-users/conditions/verified'),
        ]);
      } finally {
        strapi.config.set('autoReload', autoReload);
      }

      expect(writes.map((answer) => answer.status)).toEqual([403, 403, 403]);
      expect(
        fs.existsSync(path.join(strapi.dirs.app.src, 'end-users', 'conditions', 'verified.json'))
      ).toBe(false);

      for (const answer of writes as Array<{ body: { error: { details: { code: string } } } }>) {
        expect(answer.body.error.details.code).toBe('DEVELOPMENT_ONLY');
      }

      const status = await rqAdmin.get('/end-users/conditions/status');

      expect(status.status).toBe(200);
      expect(status.body.data).toEqual({ isUpdating: false });
    });

    it('writes a version 2 condition with an input, a Who roles check and a nested group, and previews it', async () => {
      const slug = 'v2-nested';
      const file = path.join(strapi.dirs.app.src, 'end-users', 'conditions', `${slug}.json`);
      const condition = builderFile(
        slug,
        [
          check(['emailVerified'], '$eq', { kind: 'fixed', value: true }),
          {
            kind: 'group',
            match: 'any',
            items: [
              check(['name'], '$startsWith', { kind: 'input', name: 'prefix' }),
              check(['name'], '$null', { kind: 'fixed', value: true }),
            ],
          },
        ],
        {
          inputs: [{ name: 'prefix', kind: 'text', required: false, default: 'S' }],
          who: {
            match: 'all',
            checks: [{ kind: 'roles', match: 'any', roles: ['Authenticated'] }],
          },
        }
      );
      // A write asks the server to restart, which the harness must not do
      const reloadSpy = jest.spyOn(strapi, 'reload', 'get').mockReturnValue(
        Object.assign(jest.fn(), {
          isWatching: true,
          isReloading: false,
          resumeWatching: jest.fn(),
        }) as never
      );

      try {
        const created = await rqAdmin.post('/end-users/conditions', { body: condition });

        expect(created.status).toBe(201);
        expect(created.body.data).toMatchObject({
          name: `api::${slug}`,
          builder: condition,
          rolesNamed: ['Authenticated'],
          params: [{ name: 'prefix' }],
        });

        // Its file is there, but the registry only takes it at the next start: preview checks it as a save would
        const sample = await makeUser('conditions-v2-sample@example.com', {
          emailVerified: true,
          name: 'Sam',
        });
        const preview = await previewOf(rqAdmin, condition, sample.documentId, { prefix: 'S' });

        expect(preview.status).toBe(200);
        expect(preview.body.data).toEqual({
          matching: expect.any(Number),
          total: await strapi.documents(USER_UID).count({}),
        });

        // The rule "a new input needs a default while roles use this condition" (400) is not checked
        // here: it needs the condition loaded by the registry and used by a role, and the write above
        // leaves the service waiting for a restart (a second write answers 409), which the harness
        // does not do. The condition service's own test covers it
      } finally {
        reloadSpy.mockRestore();
        fs.rmSync(file, { force: true });
      }
    });

    it('serves the builder layout: the content types with their attributes, the end user, the profile and the role names', async () => {
      const res = await rqAdmin.get('/end-users/conditions/builder-layout');

      expect(res.status).toBe(200);

      const article = res.body.data.contentTypes.find(
        ({ uid }: { uid: string }) => uid === 'api::article.article'
      );

      expect(article.attributes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'title', type: 'string' }),
          expect.objectContaining({ name: 'createdAt', type: 'datetime' }),
        ])
      );
      expect(article.userRelations).toContain('author');
      expect(res.body.data.userAttributes.length).toBeGreaterThan(0);
      expect(Array.isArray(res.body.data.profileAttributes)).toBe(true);
      expect(res.body.data.roles.length).toBeGreaterThan(0);
    });

    it('refuses a preview that filters on a field the admin may not read, and counts for one that may', async () => {
      // May list conditions and read end users in the Content Manager, but only their name
      const role = await utils.createRole({
        name: 'End users name reader',
        description: 'Holds conditions.read and the Content Manager read of end users, name only',
      });
      adminRoleIds.push(role.id);
      await utils.assignPermissionsToRole(role.id, [
        { action: CONDITIONS_READ_ACTION, subject: null, conditions: [], properties: {} },
        {
          action: CONTENT_MANAGER_READ,
          subject: USER_UID,
          conditions: [],
          properties: { fields: ['name'] },
        },
      ]);
      const rqNameReader = await createAdminUser('end-users-name-reader@example.com', role.id);
      const sample = await makeUser('conditions-name-reader-sample@example.com', { name: 'Sam' });

      const onName = builderFile('named', [
        check(['name'], '$startsWith', { kind: 'fixed', value: 'S' }),
      ]);
      const allowed = await previewOf(rqNameReader, onName, sample.documentId);

      expect(allowed.status).toBe(200);
      expect(allowed.body.data.matching).toBeGreaterThanOrEqual(1);

      // `emailVerified` is a field of the user they may not read: a count on it would tell them
      const refused = await previewOf(rqNameReader, verifiedCondition, sample.documentId);

      expect(refused.status).toBe(403);
      expect(refused.body.error.message).toContain('emailVerified');

      // Nor may they fill a value from an attribute of the user they may not read
      const throughUser = await previewOf(
        rqNameReader,
        builderFile('named', [check(['name'], '$eq', { kind: 'user', attribute: 'email' })]),
        sample.documentId
      );

      expect(throughUser.status).toBe(403);
      expect(throughUser.body.error.message).toContain('email');
    });
  });

  describe('export and import', () => {
    it('round-trips a role through export and import', async () => {
      // Rows an import accepts (`checkRows`): actions this installation's routes have, fields its
      // types have, a registered condition with the params it needs
      const role = await roles.create({
        name: 'Round trip',
        description: 'Goes to a file and back',
        requireTwoFactor: true,
        permissions: [
          row('plugin::end-users.profile.findOne', 'plugin::end-users.profile'),
          {
            ...row('plugin::end-users.profile.find'),
            properties: { fields: ['user'], populateDepth: 2 },
          },
          {
            ...row('plugin::end-users.profile.update'),
            conditions: [{ name: 'plugin::end-users.is-owner', params: { field: 'user' } }],
          },
        ],
      });

      const exported = await rqAdmin.get(`/end-users/roles/${role.documentId}/export`);

      expect(exported.status).toBe(200);

      // The file is the body itself, keyed by action and subject, and carries no id
      expect(exported.body).toMatchObject({
        version: 1,
        role: {
          name: 'Round trip',
          description: 'Goes to a file and back',
          type: 'custom',
          requireTwoFactor: true,
        },
      });
      expect(exported.body.permissions).toHaveLength(3);
      expect(exported.body.permissions[0]).toEqual({
        action: 'plugin::end-users.profile.find',
        subject: null,
        properties: { fields: ['user'], populateDepth: 2 },
        conditions: [],
      });
      expect(JSON.stringify(exported.body)).not.toContain(role.documentId);

      // As it is, the name is taken
      const taken = await rqAdmin.post('/end-users/roles/import', { body: exported.body });

      expect(taken.status).toBe(400);

      const file = { ...exported.body, role: { ...exported.body.role, name: 'Round trip copy' } };
      const imported = await rqAdmin.post('/end-users/roles/import', { body: file });

      expect(imported.status).toBe(201);
      expect(imported.body.data.documentId).not.toBe(role.documentId);
      expect(imported.body.data).toMatchObject({
        name: 'Round trip copy',
        description: 'Goes to a file and back',
        type: 'custom',
        requireTwoFactor: true,
      });
      expect(asKeys(imported.body.data.permissions)).toEqual(asKeys(role.permissions));

      // And what is read back is the same permissions, down to their properties and conditions
      const again = await rqAdmin.get(`/end-users/roles/${imported.body.data.documentId}/export`);

      expect(again.body.permissions).toEqual(exported.body.permissions);
    });

    it('imports a Public file as a new custom role, never a second Public', async () => {
      // What Public holds when it is created, whatever an earlier file or test left on it: an import
      // checks every row against this installation (`checkRows`)
      await setRolePermissions(strapi, 'public', []);

      const publicRole = await roleOfType('public');

      const exported = await rqAdmin.get(`/end-users/roles/${publicRole.documentId}/export`);

      expect(exported.status).toBe(200);
      expect(exported.body.role.type).toBe('public');

      const imported = await rqAdmin.post('/end-users/roles/import', {
        body: { ...exported.body, role: { ...exported.body.role, name: 'Public copy' } },
      });

      expect(imported.status).toBe(201);
      expect(imported.body.data.type).toBe('custom');
      expect(await strapi.documents(ROLE_UID).count({ filters: { type: 'public' } })).toBe(1);
    });

    it('refuses a file that is not a role file, or whose rows this installation cannot honor, and creates nothing', async () => {
      const before = await strapi.documents(ROLE_UID).count({});

      const answers = await sequentially([
        rqAdmin.post('/end-users/roles/import', { body: {} }),
        rqAdmin.post('/end-users/roles/import', {
          body: { version: 2, role: { name: 'Future' }, permissions: [] },
        }),
        rqAdmin.post('/end-users/roles/import', {
          body: { version: 1, role: { name: 'No list' } },
        }),
        rqAdmin.post('/end-users/roles/import', {
          body: { version: 1, role: { name: 'Bad row' }, permissions: [{ action: '' }] },
        }),
        rqAdmin.post('/end-users/roles/import', {
          body: {
            version: 1,
            role: { name: 'Unknown action', description: null, type: 'custom' },
            permissions: [row('api::nope.nope.find')],
          },
        }),
      ]);

      expect(answers.map((answer) => answer.status)).toEqual([400, 400, 400, 400, 400]);
      expect(await strapi.documents(ROLE_UID).count({})).toBe(before);
    });
  });
});
