import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createUtils } from 'api-tests/utils';
import type { Core } from '@strapi/types';

/**
 * The permission ceiling on a localized content type. On a localized subject, i18n enforces a
 * held permission with no `locales` key as no locale (`locale $in []`), so it cannot be used to
 * grant `locales: null` (every locale) or any locale, on a role or on an admin token.
 */
describe('Permission ceiling on a localized content type (api)', () => {
  const builder = createTestBuilder();
  let strapi: Core.Strapi;
  let utils: ReturnType<typeof createUtils>;
  let rqRequester: Awaited<ReturnType<typeof createAuthRequest>>;

  const READ = 'plugin::content-manager.explorer.read';
  const ARTICLE = 'api::ceiling-article.ceiling-article';
  const REQUESTER_EMAIL = 'localized-ceiling-requester@test.com';

  let requesterRole: { id: number };
  let targetRole: { id: number };
  let requesterId: number;

  const updateTargetRolePermissions = (permissions: object[]) =>
    rqRequester({
      url: `/admin/roles/${targetRole.id}/permissions`,
      method: 'PUT',
      body: { permissions },
    });

  const findTargetRolePermissions = () =>
    strapi.db.query('admin::permission').findMany({
      where: { role: { id: targetRole.id } },
      orderBy: { id: 'asc' },
    });

  const deleteAllAdminTokens = () =>
    strapi.db.query('admin::api-token').deleteMany({ where: { kind: 'admin' } });

  beforeAll(async () => {
    await builder
      .addContentType({
        singularName: 'ceiling-article',
        pluralName: 'ceiling-articles',
        displayName: 'CeilingArticle',
        draftAndPublish: false,
        pluginOptions: { i18n: { localized: true } },
        attributes: {
          title: { type: 'string', pluginOptions: { i18n: { localized: true } } },
          body: { type: 'string', pluginOptions: { i18n: { localized: true } } },
        },
      })
      .build();

    strapi = await createStrapiInstance();
    strapi.config.set('admin.secrets.encryptionKey', 'test-encryption-key');
    utils = createUtils(strapi);

    requesterRole = await utils.createRole({
      name: 'localized-ceiling-requester',
      description: 'Holds Article read on title with no locales key',
    });

    // `assignPermissionsToRole` skips i18n's hook, so the row is stored with no `locales` key
    await utils.assignPermissionsToRole(requesterRole.id, [
      { action: 'admin::roles.read', subject: null, conditions: [], properties: {} },
      { action: 'admin::roles.update', subject: null, conditions: [], properties: {} },
      { action: 'admin::admin-tokens.create', subject: null, conditions: [], properties: {} },
      { action: 'admin::admin-tokens.read', subject: null, conditions: [], properties: {} },
      { action: READ, subject: ARTICLE, conditions: [], properties: { fields: ['title'] } },
    ]);

    targetRole = await utils.createRole({
      name: 'localized-ceiling-target',
      description: 'Role edited by the requester',
    });

    await utils.assignPermissionsToRole(targetRole.id, [
      {
        action: READ,
        subject: ARTICLE,
        conditions: [],
        properties: { fields: ['title'], locales: ['en'] },
      },
    ]);

    const requester = await utils.createUser({
      email: REQUESTER_EMAIL,
      firstname: 'Localized',
      lastname: 'Requester',
      isActive: true,
      roles: [requesterRole.id],
    });
    requesterId = requester.id;

    rqRequester = await createAuthRequest({
      strapi,
      userInfo: {
        email: REQUESTER_EMAIL,
        firstname: 'Localized',
        lastname: 'Requester',
        password: 'Password123',
      },
    });

    await deleteAllAdminTokens();
  });

  afterAll(async () => {
    await deleteAllAdminTokens();
    if (requesterId !== undefined) await utils.deleteUserById(requesterId);
    await utils.deleteRolesById([targetRole?.id, requesterRole?.id].filter(Boolean));
    await strapi.destroy();
    await builder.cleanup();
  });

  test('The requester holds Article read with no locales key', async () => {
    const rows = await strapi.db.query('admin::permission').findMany({
      where: { role: { id: requesterRole.id }, action: READ, subject: ARTICLE },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].properties).toEqual({ fields: ['title'] });
  });

  describe('PUT /admin/roles/:id/permissions', () => {
    test.each([
      ['every locale', null],
      ['a locale', ['fr']],
    ])('Cannot grant %s from a held permission with no locales key', async (_, locales) => {
      const before = await findTargetRolePermissions();

      const res = await updateTargetRolePermissions([
        {
          action: READ,
          subject: ARTICLE,
          properties: { fields: ['title'], locales },
          conditions: [],
        },
      ]);

      expect(res.statusCode).toBe(403);
      expect(res.body.error.message).toBe('You cannot grant permissions you do not hold yourself');
      expect(await findTargetRolePermissions()).toEqual(before);
    });
  });

  describe('POST /admin/admin-tokens', () => {
    test('Cannot create a token for every locale from a held permission with no locales key', async () => {
      const res = await rqRequester({
        url: '/admin/admin-tokens',
        method: 'POST',
        body: {
          name: 'localized-ceiling-token',
          description: '',
          adminPermissions: [
            { action: READ, subject: ARTICLE, properties: { fields: ['title'], locales: null } },
          ],
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toContain(
        'locales are required due to owner locale restrictions'
      );

      const tokens = await strapi.db
        .query('admin::api-token')
        .findMany({ where: { kind: 'admin', name: 'localized-ceiling-token' } });
      expect(tokens).toHaveLength(0);
    });
  });
});
