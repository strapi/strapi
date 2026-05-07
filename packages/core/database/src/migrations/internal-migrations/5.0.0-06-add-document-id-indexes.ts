import type { Knex } from 'knex';

import type { Migration } from '../common';
import type { Database } from '../..';

/**
 * Previously created secondary indexes on `document_id` (and composites) via raw DDL.
 * Those indexes are now owned by schema sync from model metadata (see transform-content-types-to-models).
 * Keep this migration as a stable no-op so Umzug / `strapi_migrations_internal` stay consistent.
 */

export const addDocumentIdIndexes: Migration = {
  name: '5.0.0-06-add-document-id-indexes',
  // Keeping the Umzug signature without doing any DDL; callers pass knex/db for other migrations only.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by MigrationFn
  async up(_knex: Knex.Transaction, _db: Database) {
    await Promise.resolve();
  },
  async down() {
    throw new Error('not implemented');
  },
};
