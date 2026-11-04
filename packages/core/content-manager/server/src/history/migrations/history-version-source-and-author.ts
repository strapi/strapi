import type { Database, Migration } from '@strapi/database';

import type { HistoryVersionSource } from '../../../../shared/contracts/history-versions';
import { historyVersion } from '../models/history-version';

type MigrationTrx = Parameters<Migration['up']>[0];

// Show all versions as originating from the `admin-panel`, even though it is wrong
// for `admin-tokens` write. We have no way to recover this information.
const LEGACY_SOURCE: HistoryVersionSource = 'admin-panel';

const getTable = (trx: MigrationTrx, db: Database, tableName: string) => {
  const schemaName = db.getSchemaName();
  const table = trx(tableName);

  return schemaName ? table.withSchema(schemaName) : table;
};

export const historyVersionSourceAndAuthor: Migration = {
  name: 'content-manager::history-version-source-and-author',
  async up(trx, db) {
    const { tableName } = historyVersion;

    if (!(await db.getSchemaConnection(trx).hasTable(tableName))) {
      return;
    }

    if (!(await db.getSchemaConnection(trx).hasColumn(tableName, 'source'))) {
      await db.getSchemaConnection(trx).alterTable(tableName, (table) => {
        table.string('source');
      });
    }

    await getTable(trx, db, tableName).whereNull('source').update({ source: LEGACY_SOURCE });
  },
  async down() {
    throw new Error('not implemented');
  },
};
