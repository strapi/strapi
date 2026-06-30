'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest, createRequest } = require('api-tests/request');
const { createUtils } = require('api-tests/utils');

const EXPLORER_READ = 'plugin::content-manager.explorer.read';
const HIDDEN_ROLE_UID = 'plugin::users-permissions.role';
const SENSITIVE_ADMIN_USER_FIELDS = ['password', 'resetPasswordToken', 'registrationToken'];

let strapi;
let rq;
let rqEditor;
let rqAuthor;
let rqNarrow;
let utils;

const internals = {
  userIds: [],
  roleIds: [],
};

const getNonDisplayedContentTypeUids = () =>
  Object.values(strapi.contentTypes)
    .filter((contentType) => contentType?.pluginOptions?.['content-manager']?.visible === false)
    .map((contentType) => contentType.uid);

const getPublicUpRole = () =>
  strapi.db.query(HIDDEN_ROLE_UID).findOne({
    where: { type: 'public' },
  });

const hiddenRoleReadUrl = (documentId) =>
  `/content-manager/collection-types/${HIDDEN_ROLE_UID}/${documentId}`;

const createAdminUserForRoleCode = async (email, roleCode) => {
  const role = await strapi.db.query('admin::role').findOne({
    where: { code: roleCode },
  });

  const user = await utils.createUser({
    email,
    firstname: 'Test',
    lastname: roleCode,
    roles: [role.id],
  });

  internals.userIds.push(user.id);

  return createAuthRequest({
    strapi,
    userInfo: { email },
  });
};

describe('CM API - hidden content type read (#23622)', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance();
    utils = createUtils(strapi);
    rq = await createAuthRequest({ strapi });

    rqEditor = await createAdminUserForRoleCode('editor-hidden-ct@test.com', 'strapi-editor');
    rqAuthor = await createAdminUserForRoleCode('author-hidden-ct@test.com', 'strapi-author');

    const narrowRole = await utils.createRole({
      name: 'hidden-ct-narrow-read',
      description: 'Only upload read — must not read hidden content types',
    });
    internals.roleIds.push(narrowRole.id);

    await utils.assignPermissionsToRole(narrowRole.id, [{ action: 'plugin::upload.read' }]);

    const narrowUser = await utils.createUser({
      email: 'narrow-hidden-ct@test.com',
      firstname: 'Narrow',
      lastname: 'Reader',
      roles: [narrowRole.id],
    });
    internals.userIds.push(narrowUser.id);

    rqNarrow = await createAuthRequest({
      strapi,
      userInfo: { email: 'narrow-hidden-ct@test.com' },
    });
  });

  afterAll(async () => {
    if (internals.userIds.length) {
      await utils.deleteUsersById(internals.userIds);
    }
    if (internals.roleIds.length) {
      await utils.deleteRolesById(internals.roleIds);
    }
    await strapi.destroy();
  });

  describe('admin-only access', () => {
    test('unauthenticated admin requests cannot read hidden content types', async () => {
      const role = await getPublicUpRole();
      const rqPublic = createRequest({ strapi });

      const res = await rqPublic({
        method: 'GET',
        url: hiddenRoleReadUrl(role.documentId),
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('default role permissions', () => {
    test('editor and author roles are not granted explorer.read on hidden content types', async () => {
      const hiddenUids = getNonDisplayedContentTypeUids();
      expect(hiddenUids).toContain(HIDDEN_ROLE_UID);

      for (const roleCode of ['strapi-editor', 'strapi-author']) {
        const role = await strapi.db.query('admin::role').findOne({
          where: { code: roleCode },
        });

        const readPermissions = await strapi.db.query('admin::permission').findMany({
          where: {
            role: role.id,
            action: EXPLORER_READ,
          },
        });

        const hiddenReadPermissions = readPermissions.filter((permission) =>
          hiddenUids.includes(permission.subject)
        );

        expect(hiddenReadPermissions).toHaveLength(0);
      }
    });

    test.each([
      ['editor', () => rqEditor],
      ['author', () => rqAuthor],
      ['custom narrow role', () => rqNarrow],
    ])(
      '%s cannot read hidden users-permissions role via content manager',
      async (_label, getRq) => {
        const role = await getPublicUpRole();

        const res = await getRq()({
          method: 'GET',
          url: hiddenRoleReadUrl(role.documentId),
        });

        expect(res.statusCode).toBe(403);
      }
    );
  });

  describe('super admin read access', () => {
    test('super admin can read plugin::users-permissions.role via content manager', async () => {
      const role = await getPublicUpRole();

      const res = await rq({
        method: 'GET',
        url: hiddenRoleReadUrl(role.documentId),
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toEqual(
        expect.objectContaining({
          documentId: role.documentId,
          name: role.name,
        })
      );
      expect(res.body.data).not.toHaveProperty('password');
      expect(res.body.data).not.toHaveProperty('resetPasswordToken');
      expect(res.body.data).not.toHaveProperty('registrationToken');
    });

    test('super admin read of hidden admin::user does not expose credential fields', async () => {
      const adminUser = await strapi.db.query('admin::user').findOne({
        where: { email: 'admin@strapi.io' },
      });

      const res = await rq({
        method: 'GET',
        url: `/content-manager/collection-types/admin::user/${adminUser.documentId}`,
      });

      expect(res.statusCode).toBe(200);

      for (const field of SENSITIVE_ADMIN_USER_FIELDS) {
        expect(res.body.data).not.toHaveProperty(field);
      }
    });

    test('editor cannot read hidden admin::user via content manager', async () => {
      const adminUser = await strapi.db.query('admin::user').findOne({
        where: { email: 'admin@strapi.io' },
      });

      const res = await rqEditor({
        method: 'GET',
        url: `/content-manager/collection-types/admin::user/${adminUser.documentId}`,
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('write actions remain blocked on hidden content types', () => {
    test('super admin cannot create, update, or delete hidden users-permissions roles via content manager', async () => {
      const role = await getPublicUpRole();
      const baseUrl = `/content-manager/collection-types/${HIDDEN_ROLE_UID}`;

      const createRes = await rq({
        method: 'POST',
        url: baseUrl,
        body: {
          name: 'should-not-create',
          description: 'blocked',
          type: 'blocked-test',
        },
      });
      expect(createRes.statusCode).toBe(403);

      const updateRes = await rq({
        method: 'PUT',
        url: `${baseUrl}/${role.documentId}`,
        body: {
          name: 'should-not-update',
        },
      });
      expect(updateRes.statusCode).toBe(403);

      const deleteRes = await rq({
        method: 'DELETE',
        url: `${baseUrl}/${role.documentId}`,
      });
      expect(deleteRes.statusCode).toBe(403);
    });
  });
});
