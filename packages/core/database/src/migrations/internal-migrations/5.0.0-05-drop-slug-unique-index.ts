/**
 * In V4 slug fields contained a unique index.
 * In V5 slug fields should not have a unique index.
 *
 * This migration drops existing unique indexes from slug fields so downstream migrations
 * can work on the data without violating the unique index.
 */
import type { Knex } from 'knex';

import type { Migration } from '../common';
import { transformLogMessage } from '../logger';

const migrationScriptId = '5.0.0-05-drop-slug-fields-index';

const dropIndex = async (knex: Knex, tableName: string, columnName: string) => {
  try {
    await knex.schema.alterTable(tableName, (table) => {
      // NOTE: Can not use "identifiers" utility, as the 5.0.0-01 migration does not rename this particular index
      // to `tableName_columnName_uq`.
      table.dropUnique([columnName], `${tableName}_${columnName}_unique`);
    });
  } catch (error) {
    // If unique index does not exist, do nothing
  }
};

export const dropSlugFieldsIndex: Migration = {
  name: migrationScriptId,
  async up(knex, db) {
    db.logger.info(transformLogMessage('info', `Migration ${migrationScriptId} running`));
    for (const meta of db.metadata.values()) {
      const hasTable = await knex.schema.hasTable(meta.tableName);
      if (!hasTable) {
        continue;
      }

      for (const attribute of Object.values(meta.attributes)) {
        if (attribute.type === 'uid' && attribute.columnName) {
          await dropIndex(knex, meta.tableName, attribute.columnName);
        }
      }
    }
    db.logger.info(transformLogMessage('info', `Migration ${migrationScriptId} completed`));
  },
  async down() {
    throw new Error('not implemented');
  },
};
