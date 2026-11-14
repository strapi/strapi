import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createUtils } from 'api-tests/utils';
import type { Core } from '@strapi/types';

/**
 * The admin boot cleanup on a localized content type. i18n reads `locales: null` as every locale,
 * so a role saved with every locale on delete or publish must keep those permissions after a
 * restart.
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

  const findRolePermissions = () =>
    strapi.db.query('admin::permission').findMany({
      where: { role: { id: roleId }, subject: ARTICLE },
      orderBy: { action: 'asc' },
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

  test('Every-locale delete and publish saved through the API survive a restart', async () => {
    const res = await rq({
      url: `/admin/roles/${roleId}/permissions`,
      method: 'PUT',
      body: {
        permissions: [
          { action: DELETE, subject: ARTICLE, properties: { locales: null }, conditions: [] },
          { action: PUBLISH, subject: ARTICLE, properties: { locales: null }, conditions: [] },
        ],
      },
    });

    expect(res.statusCode).toBe(200);

    const expected = [
      expect.objectContaining({ action: DELETE, properties: { locales: null } }),
      expect.objectContaining({ action: PUBLISH, properties: { locales: null } }),
    ];

    expect(await findRolePermissions()).toEqual(expected);

    await strapi.destroy();
    strapi = await createStrapiInstance();
    utils = createUtils(strapi);

    expect(await findRolePermissions()).toEqual(expected);
  });
});
