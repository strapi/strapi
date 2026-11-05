import type { Database, Migration } from '@strapi/database';

import type { HistoryVersionSource } from '../../../../shared/contracts/history-versions';
import { historyVersion } from '../models/history-version';
import { getAdminUserAuthor, type AdminUser } from '../origin/authors';

type MigrationTrx = Parameters<Migration['up']>[0];

// Show all versions as originating from the `admin-panel`, even though it is wrong
// for `admin-tokens` write. We have no way to recover this information.
const LEGACY_SOURCE: HistoryVersionSource = 'admin-panel';

const getTable = (trx: MigrationTrx, db: Database, tableName: string) => {
  const schemaName = db.getSchemaName();
  const table = trx(tableName);

  return schemaName ? table.withSchema(schemaName) : table;
};

const NEW_COLUMNS = ['source', 'author_type', 'author_name', 'author_model', 'author_id'];

export const historyVersionSourceAndAuthor: Migration = {
  name: 'content-manager::history-version-source-and-author',
  async up(trx, db) {
    const { tableName } = historyVersion;

    if (!(await db.getSchemaConnection(trx).hasTable(tableName))) {
      return;
    }

    const missingColumns: string[] = [];

    for (const columnName of NEW_COLUMNS) {
      if (!(await db.getSchemaConnection(trx).hasColumn(tableName, columnName))) {
        missingColumns.push(columnName);
      }
    }

    if (missingColumns.length > 0) {
      await db.getSchemaConnection(trx).alterTable(tableName, (table) => {
        missingColumns.forEach((columnName) => table.string(columnName));
      });
    }

    await getTable(trx, db, tableName).whereNull('source').update({ source: LEGACY_SOURCE });

    const adminUsers: AdminUser[] = await getTable(
      trx,
      db,
      db.metadata.get('admin::user').tableName
    ).select('id', 'username', 'firstname', 'lastname', 'email');

    for (const adminUser of adminUsers) {
      const author = getAdminUserAuthor(adminUser);

      await getTable(trx, db, tableName)
        .where('created_by_id', adminUser.id)
        .whereNull('author_type')
        .update({
          author_type: author.type,
          author_name: author.name,
          author_model: author.model,
          author_id: author.id,
        });
    }
  },
  async down() {
    throw new Error('not implemented');
  },
};
