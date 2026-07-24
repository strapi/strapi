/**
 * Add + backfill `component_key` on existing component tables.
 *
 * Internal migrations run *before* schema sync, so this migration must create the
 * column when missing. Schema sync then tracks it via the system `componentKey`
 * attribute on component models (transformContentTypesToModels).
 *
 * Existing draft/published pairs get unique keys per row; they share a key after
 * the next publish (createComponent preserves keys when cloning draft → published).
 *
 * @see docs/docs/rfcs/03-component-key.md
 */
import { createId } from '@paralleldrive/cuid2';
import type { Knex } from 'knex';

import type { Migration } from '../common';
import type { Database } from '../..';

const COMPONENT_KEY_COLUMN = 'component_key';

const ensureAndBackfillComponentKeys = async (knex: Knex, db: Database) => {
  for (const meta of db.metadata.values()) {
    // Only component models receive the system `componentKey` attribute
    if (!meta.attributes?.componentKey) {
      continue;
    }

    const tableName = meta.tableName;
    const hasTable = await knex.schema.hasTable(tableName);
    if (!hasTable) {
      continue;
    }

    const hasColumn = await knex.schema.hasColumn(tableName, COMPONENT_KEY_COLUMN);
    if (!hasColumn) {
      await knex.schema.alterTable(tableName, (table) => {
        table.string(COMPONENT_KEY_COLUMN);
      });
    }

    // Process in batches to avoid loading entire tables
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const rows: Array<{ id: number | string }> = await knex(tableName)
        .select('id')
        .whereNull(COMPONENT_KEY_COLUMN)
        .limit(500);

      if (rows.length === 0) {
        break;
      }

      for (const row of rows) {
        await knex(tableName)
          .where({ id: row.id })
          .update({ [COMPONENT_KEY_COLUMN]: createId() });
      }
    }
  }
};

export const createdComponentKey: Migration = {
  name: '5.0.0-07-component-key',
  async up(knex, db) {
    await ensureAndBackfillComponentKeys(knex, db);
  },
  async down() {
    // Keys are additive; column drop is handled by schema sync if the attribute is removed
  },
};
