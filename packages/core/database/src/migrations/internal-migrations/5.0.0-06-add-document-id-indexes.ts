import type { Migration } from '../common';

/**
 * Previously created secondary indexes on `document_id` (and composites) via raw DDL.
 * Those indexes are now owned by schema sync from model metadata (see transform-content-types-to-models).
 * Keep this migration as a stable no-op so Umzug / `strapi_migrations_internal` stay consistent.
 */

export const addDocumentIdIndexes: Migration = {
  name: '5.0.0-06-add-document-id-indexes',
  async up() {
    // No-op: the document_id indexes are now created by schema sync (see transform-content-types-to-models).
  },
  async down() {
    throw new Error('not implemented');
  },
};
