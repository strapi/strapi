import type { Knex } from 'knex';

import type { Migration } from '../common';

/**
 * In v4, content types with disabled D&P did not have any `published_at` column.
 * In v5, we need to add a `published_at` column to all content types.
 * Other downstream migrations will make use of this column.
 *
 * This function creates the `published_at` column if it doesn't exist.
 */
const createPublishedAtColumn = async (db: Knex, tableName: string) => {
  await db.schema.alterTable(tableName, (table) => {
    table.string('published_at');
  });
};

export const createdPublishedAt: Migration = {
  name: '5.0.0-04-created-published-at',
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

      // Create publishedAt column if it doesn't exist
      const hasPublishedAtColumn = await knex.schema.hasColumn(meta.tableName, 'published_at');

      if (meta.attributes.publishedAt && !hasPublishedAtColumn) {
        await createPublishedAtColumn(knex, meta.tableName);
      }
    }
  },
  async down() {
    throw new Error('not implemented');
  },
};
