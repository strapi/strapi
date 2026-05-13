import type { Migration } from '@strapi/database';

type Knex = Parameters<Migration['up']>[0];

const ADMIN_USERS_TABLE = 'admin_users';
const PREFERED_LANGUAGE_COLUMN = 'prefered_language';

/**
 * Migrates persisted admin UI language from the legacy Danish code `dk` to ISO 639-1 `da`.
 */
export const migrateAdminPreferedLanguageDkToDa: Migration = {
  name: 'admin::migrate-prefered-language-dk-to-da',
  async up(trx: Knex) {
    const hasTable = await trx.schema.hasTable(ADMIN_USERS_TABLE);

    if (!hasTable) {
      return;
    }

    const hasColumn = await trx.schema.hasColumn(ADMIN_USERS_TABLE, PREFERED_LANGUAGE_COLUMN);

    if (!hasColumn) {
      return;
    }

    await trx(ADMIN_USERS_TABLE)
      .where(PREFERED_LANGUAGE_COLUMN, 'dk')
      .update({ [PREFERED_LANGUAGE_COLUMN]: 'da' });
  },
  async down() {
    throw new Error('not implemented');
  },
};
