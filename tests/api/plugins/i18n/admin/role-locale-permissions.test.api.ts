import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createUtils } from 'api-tests/utils';
import type { Core } from '@strapi/types';

const READ_ACTION = 'plugin::content-manager.explorer.read';

const localizedArticleModel = {
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  attributes: {
    title: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
  },
  displayName: 'Locale Perm Article',
  singularName: 'locale-perm-article',
  pluralName: 'locale-perm-articles',
};

const nonLocalizedArticleModel = {
  attributes: {
    title: {
      type: 'string',
    },
  },
  displayName: 'Locale Repair Article',
  singularName: 'locale-repair-article',
  pluralName: 'locale-repair-articles',
};

const LOCALIZED_CT_UID = 'api::locale-perm-article.locale-perm-article';
const REPAIR_CT_UID = 'api::locale-repair-article.locale-repair-article';

const uniqueName = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const getStoredReadPermission = async (strapi: Core.Strapi, roleId: number, subject: string) => {
  const permissions = await strapi.db.query('admin::permission').findMany({
    where: {
      role: { id: roleId },
      subject,
      action: READ_ACTION,
    },
  });

  return permissions[0] as { properties?: { locales?: string[] | null } } | undefined;
};

describe('i18n role locale permissions (api)', () => {
  describe('normalize on role save', () => {
    const builder = createTestBuilder();
    let strapi: Core.Strapi;
    let rq: Awaited<ReturnType<typeof createAuthRequest>>;
    let utils: ReturnType<typeof createUtils>;

    beforeAll(async () => {
      await builder.addContentType(localizedArticleModel).build();

      strapi = await createStrapiInstance();
      rq = await createAuthRequest({ strapi });
      utils = createUtils(strapi);
    });

    afterAll(async () => {
      await strapi.destroy();
      await builder.cleanup();
    });

    test('fills in the default locale when locales is an empty array', async () => {
      const role = await utils.createRole({
        name: uniqueName('locale-normalize-empty'),
        description: 'Role for empty locales normalization',
      });

      const res = await rq({
        url: `/admin/roles/${role.id}/permissions`,
        method: 'PUT',
        body: {
          permissions: [
            {
              action: READ_ACTION,
              subject: LOCALIZED_CT_UID,
              properties: { fields: ['title'], locales: [] },
              conditions: [],
            },
          ],
        },
      });

      expect(res.statusCode).toBe(200);

      const stored = await getStoredReadPermission(strapi, role.id, LOCALIZED_CT_UID);
      expect(stored?.properties?.locales).toEqual(['en']);
    });

    test('fills in the default locale when locales is missing', async () => {
      const role = await utils.createRole({
        name: uniqueName('locale-normalize-missing'),
        description: 'Role for missing locales normalization',
      });

      const res = await rq({
        url: `/admin/roles/${role.id}/permissions`,
        method: 'PUT',
        body: {
          permissions: [
            {
              action: READ_ACTION,
              subject: LOCALIZED_CT_UID,
              properties: { fields: ['title'] },
              conditions: [],
            },
          ],
        },
      });

      expect(res.statusCode).toBe(200);

      const stored = await getStoredReadPermission(strapi, role.id, LOCALIZED_CT_UID);
      expect(stored?.properties?.locales).toEqual(['en']);
    });

    test('preserves null locales (all locales access)', async () => {
      const role = await utils.createRole({
        name: uniqueName('locale-normalize-null'),
        description: 'Role for null locales preservation',
      });

      const res = await rq({
        url: `/admin/roles/${role.id}/permissions`,
        method: 'PUT',
        body: {
          permissions: [
            {
              action: READ_ACTION,
              subject: LOCALIZED_CT_UID,
              properties: { fields: ['title'], locales: null },
              conditions: [],
            },
          ],
        },
      });

      expect(res.statusCode).toBe(200);

      const stored = await getStoredReadPermission(strapi, role.id, LOCALIZED_CT_UID);
      expect(stored?.properties?.locales).toBeNull();
    });
  });

  describe('repair after enabling i18n on a content type', () => {
    const builder = createTestBuilder();
    let strapi: Core.Strapi;
    let rq: Awaited<ReturnType<typeof createAuthRequest>>;
    let utils: ReturnType<typeof createUtils>;

    const restart = async () => {
      await strapi.destroy();
      strapi = await createStrapiInstance();
      rq = await createAuthRequest({ strapi });
      utils = createUtils(strapi);
    };

    beforeAll(async () => {
      await builder.addContentType(nonLocalizedArticleModel).build();

      strapi = await createStrapiInstance();
      rq = await createAuthRequest({ strapi });
      utils = createUtils(strapi);
    });

    afterAll(async () => {
      await strapi.destroy();
      await builder.cleanup();
    });

    test('patches missing locales and preserves null locales when i18n is enabled', async () => {
      const missingLocalesRole = await utils.createRole({
        name: uniqueName('locale-repair-missing'),
        description: 'Role with missing locale scope',
      });
      const nullLocalesRole = await utils.createRole({
        name: uniqueName('locale-repair-null'),
        description: 'Role with all-locales locale scope',
      });

      await utils.assignPermissionsToRole(missingLocalesRole.id, [
        {
          action: READ_ACTION,
          subject: REPAIR_CT_UID,
          conditions: [],
          properties: { fields: ['title'] },
        },
      ]);
      await utils.assignPermissionsToRole(nullLocalesRole.id, [
        {
          action: READ_ACTION,
          subject: REPAIR_CT_UID,
          conditions: [],
          properties: { fields: ['title'], locales: null },
        },
      ]);

      const res = await rq({
        method: 'PUT',
        url: `/content-type-builder/content-types/${REPAIR_CT_UID}`,
        body: {
          contentType: {
            displayName: nonLocalizedArticleModel.displayName,
            singularName: nonLocalizedArticleModel.singularName,
            pluralName: nonLocalizedArticleModel.pluralName,
            draftAndPublish: false,
            pluginOptions: {
              i18n: {
                localized: true,
              },
            },
            attributes: {
              title: {
                type: 'string',
                pluginOptions: {
                  i18n: {
                    localized: true,
                  },
                },
              },
            },
          },
        },
      });

      expect(res.statusCode).toBe(201);

      await restart();

      expect(strapi.contentTypes[REPAIR_CT_UID].pluginOptions?.i18n?.localized).toBe(true);

      const missingLocalesPermission = await getStoredReadPermission(
        strapi,
        missingLocalesRole.id,
        REPAIR_CT_UID
      );
      const nullLocalesPermission = await getStoredReadPermission(
        strapi,
        nullLocalesRole.id,
        REPAIR_CT_UID
      );

      expect(missingLocalesPermission?.properties?.locales).toEqual(['en']);
      expect(nullLocalesPermission?.properties?.locales).toBeNull();
    });
  });
});
