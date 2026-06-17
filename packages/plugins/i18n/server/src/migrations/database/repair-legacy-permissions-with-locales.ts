import type { Migration, Database } from '@strapi/database';

type Knex = Parameters<Migration['up']>[0];

/**
 * One-time migration that patches role permissions on localized content types where
 * `properties.locales` is missing or empty (`[]`). These broken rows were produced by
 * enabling i18n on a content type that already had role permissions — the old code did
 * not back-fill the locale scope, so the permission engine treated them as "no access".
 *
 * `properties.locales === null` means "all locales" and is intentionally left untouched.
 */
export const repairLegacyPermissionsWithLocales: Migration = {
  name: 'i18n::repair-legacy-permissions-with-locales',

  async up(_trx: Knex, db: Database) {
    const hasTable = await _trx.schema.hasTable('admin_permissions');
    if (!hasTable) {
      return;
    }

    const i18nPlugin = strapi.plugin('i18n');
    if (!i18nPlugin) {
      return;
    }

    const defaultLocale = await i18nPlugin.service('locales').getDefaultLocale();
    if (!defaultLocale) {
      return;
    }

    const { isLocalizedContentType } = i18nPlugin.service('content-types');

    const localizedUids = new Set(
      Object.values(strapi.contentTypes)
        .filter(isLocalizedContentType)
        .map((ct: any) => ct.uid)
    );

    if (localizedUids.size === 0) {
      return;
    }

    const allPermissions = await (db as any).query('admin::permission').findMany({});

    const toRepair = allPermissions.filter((perm: any) => {
      if (!perm.subject || !localizedUids.has(perm.subject)) {
        return false;
      }
      const properties: Record<string, unknown> = perm.properties ?? {};
      if (!('locales' in properties)) {
        return true;
      }
      const { locales } = properties;
      // null means "all locales" — leave it alone
      return locales !== null && Array.isArray(locales) && locales.length === 0;
    });

    await Promise.all(
      toRepair.map((perm: any) =>
        (db as any).query('admin::permission').update({
          where: { id: perm.id },
          data: {
            properties: { ...(perm.properties ?? {}), locales: [defaultLocale] },
          },
        })
      )
    );
  },

  async down() {
    throw new Error('not implemented');
  },
};
