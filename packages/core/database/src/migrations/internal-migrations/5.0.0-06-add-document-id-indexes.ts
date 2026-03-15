import type { Knex } from 'knex';

import type { Migration } from '../common';

/**
 * PostgreSQL silently truncates identifiers longer than 63 characters.
 * When the migration later checks for the full-length name, it does not
 * find the truncated version, and the CREATE INDEX fails with 42P07.
 */
const PG_IDENTIFIER_MAX_LENGTH = 63;

// Add an index if it does not already exist
const createIndex = async (knex: Knex, tableName: string, columns: string[], indexName: string) => {
  // Truncate to PostgreSQL's identifier limit to avoid silent name mismatch
  const safeName =
    indexName.length > PG_IDENTIFIER_MAX_LENGTH
      ? indexName.substring(0, PG_IDENTIFIER_MAX_LENGTH)
      : indexName;

  try {
    // Use a savepoint so that a duplicate-index error in PostgreSQL does not
    // abort the surrounding transaction and block all subsequent statements.
    await knex.raw('SAVEPOINT create_idx');

    await knex.schema.alterTable(tableName, (table) => {
      table.index(columns, safeName);
    });

    await knex.raw('RELEASE SAVEPOINT create_idx');
  } catch {
    // Index already exists or cannot be created — roll back to the savepoint
    // so the transaction remains usable for subsequent operations.
    try {
      await knex.raw('ROLLBACK TO SAVEPOINT create_idx');
    } catch {
      // Savepoints may not be supported (e.g. some SQLite modes); ignore.
    }
  }
};

const addIndexesForTable = async (knex: Knex, tableName: string) => {
  // Only add indexes when the column is present
  const hasDocumentId = await knex.schema.hasColumn(tableName, 'document_id');
  if (!hasDocumentId) {
    return;
  }

  const hasLocale = await knex.schema.hasColumn(tableName, 'locale');
  const hasPublishedAt = await knex.schema.hasColumn(tableName, 'published_at');

  // Single column index for basic lookups
  await createIndex(knex, tableName, ['document_id'], `${tableName}_document_id_idx`);

  if (hasLocale && hasPublishedAt) {
    // Composite index for common filters
    await createIndex(
      knex,
      tableName,
      ['document_id', 'locale', 'published_at'],
      `${tableName}_document_id_locale_published_at_idx`
    );
  } else if (hasLocale) {
    await createIndex(
      knex,
      tableName,
      ['document_id', 'locale'],
      `${tableName}_document_id_locale_idx`
    );
  } else if (hasPublishedAt) {
    await createIndex(
      knex,
      tableName,
      ['document_id', 'published_at'],
      `${tableName}_document_id_published_at_idx`
    );
  }
};

export const addDocumentIdIndexes: Migration = {
  name: '5.0.0-06-add-document-id-indexes',
  async up(knex, db) {
    for (const meta of db.metadata.values()) {
      const hasTable = await knex.schema.hasTable(meta.tableName);
      if (!hasTable) {
        continue;
      }

      await addIndexesForTable(knex, meta.tableName);
    }
  },
  async down() {
    throw new Error('not implemented');
  },
};
