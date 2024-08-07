import type { Knex } from 'knex';

import type { Migration } from '../common';

/**
 * In v4, content types with disabled i18n did not have any locale column.
 * In v5, we need to add a `locale` column to all content types.
 * Other downstream migrations will make use of this column.
 *
 * This function creates the `locale` column if it doesn't exist.
 */
const createLocaleColumn = async (db: Knex, tableName: string) => {
  await db.schema.alterTable(tableName, (table) => {
    table.string('locale');
  });
};

export const createdLocale: Migration = {
  name: '5.0.0-03-created-locale',
  async up(knex, db) {
    for (const meta of db.metadata.values()) {
      const hasTable = await knex.schema.hasTable(meta.tableName);

      if (!hasTable) {
        continue;
      }

      // Ignore non-content types
      const uid = meta.uid;
      const model = strapi.getModel(uid);
      if (!model) {
        continue;
      }

      // Create locale column if it doesn't exist
      const hasLocaleColumn = await knex.schema.hasColumn(meta.tableName, 'locale');

      if (meta.attributes.locale && !hasLocaleColumn) {
        await createLocaleColumn(knex, meta.tableName);
      }
    }
  },
  async down() {
    throw new Error('not implemented');
  },
};
