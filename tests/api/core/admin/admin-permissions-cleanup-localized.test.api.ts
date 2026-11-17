import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createUtils } from 'api-tests/utils';
import type { Core } from '@strapi/types';

/**
 * The admin boot cleanup on a localized content type. i18n reads `locales: null` as every locale,
 * so a role saved with every locale must keep those permissions after a restart. A permission whose
 * `fields` is also missing or `null` is still removed.
 */
describe('Admin permissions cleanup on a localized content type (api)', () => {
  const builder = createTestBuilder();
  let strapi: Core.Strapi;
  let utils: ReturnType<typeof createUtils>;
  let rq: Awaited<ReturnType<typeof createAuthRequest>>;
  let roleId: number;

  const ARTICLE = 'api::cleanup-article.cleanup-article';
  const DELETE = 'plugin::content-manager.explorer.delete';
  const PUBLISH = 'plugin::content-manager.explorer.publish';
  const READ = 'plugin::content-manager.explorer.read';
  const UPDATE = 'plugin::content-manager.explorer.update';

  const findRolePermissions = () =>
    strapi.db.query('admin::permission').findMany({
      where: { role: { id: roleId }, subject: ARTICLE },
      orderBy: { id: 'asc' },
    });

  beforeAll(async () => {
    await builder
      .addContentType({
        singularName: 'cleanup-article',
        pluralName: 'cleanup-articles',
        displayName: 'CleanupArticle',
        draftAndPublish: true,
        pluginOptions: { i18n: { localized: true } },
        attributes: {
          title: { type: 'string', pluginOptions: { i18n: { localized: true } } },
        },
      })
      .build();

    strapi = await createStrapiInstance();
    utils = createUtils(strapi);
    rq = await createAuthRequest({ strapi });

    const role = await utils.createRole({
      name: 'localized-cleanup-role',
      description: 'Holds every-locale delete and publish',
    });
    roleId = role.id;
  });

  afterAll(async () => {
    if (roleId !== undefined) await utils.deleteRolesById([roleId]);
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Every-locale permissions survive a restart, unless fields is also null', async () => {
    const res = await rq({
      url: `/admin/roles/${roleId}/permissions`,
      method: 'PUT',
      body: {
        permissions: [
          { action: DELETE, subject: ARTICLE, properties: { locales: null }, conditions: [] },
          { action: PUBLISH, subject: ARTICLE, properties: { locales: null }, conditions: [] },
          {
            action: READ,
            subject: ARTICLE,
            properties: { fields: ['title'], locales: null },
            conditions: [],
          },
          {
            action: UPDATE,
            subject: ARTICLE,
            properties: { fields: null, locales: null },
            conditions: [],
          },
        ],
      },
    });

    expect(res.statusCode).toBe(200);

    const kept = [
      expect.objectContaining({ action: DELETE, properties: { locales: null } }),
      expect.objectContaining({ action: PUBLISH, properties: { locales: null } }),
      expect.objectContaining({ action: READ, properties: { fields: ['title'], locales: null } }),
    ];

    expect(await findRolePermissions()).toEqual([
      ...kept,
      expect.objectContaining({ action: UPDATE, properties: { fields: null, locales: null } }),
    ]);

    await strapi.destroy();
    strapi = await createStrapiInstance();
    utils = createUtils(strapi);

    expect(await findRolePermissions()).toEqual(kept);
  });
});
