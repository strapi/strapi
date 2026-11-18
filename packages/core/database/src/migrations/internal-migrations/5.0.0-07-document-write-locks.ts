import type { Migration } from '../common';

const TABLE_NAME = 'strapi_document_locks';

export const createDocumentWriteLocks: Migration = {
  name: '5.0.0-07-document-write-locks',
  async up(knex, db) {
    if (
      db.dialect.client !== 'mysql' ||
      (await db.getSchemaConnection(knex).hasTable(TABLE_NAME))
    ) {
      return;
    }

    await db.getSchemaConnection(knex).createTable(TABLE_NAME, (table) => {
      table.string('document_id', 255).primary();
    });
  },
  async down() {
    throw new Error('not implemented');
  },
};
