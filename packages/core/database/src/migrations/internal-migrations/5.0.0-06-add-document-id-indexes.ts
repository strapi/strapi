import type { Knex } from 'knex';

import type { Migration } from '../common';

// Add an index if it does not already exist
const createIndex = async (knex: Knex, tableName: string, columns: string[], indexName: string) => {
  try {
    // If the database can check for indexes, avoid duplicates
    const hasIndex = (
      knex.schema as unknown as {
        hasIndex?: (tableName: string, indexName: string) => Promise<boolean>;
      }
    ).hasIndex;
    if (hasIndex) {
      const exists = await hasIndex.call(knex.schema, tableName, indexName);
      if (exists) {
        return;
      }
    }

    await knex.schema.alterTable(tableName, (table) => {
      table.index(columns, indexName);
    });
  } catch (error) {
    // If the index exists (or cannot be created), move on
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
