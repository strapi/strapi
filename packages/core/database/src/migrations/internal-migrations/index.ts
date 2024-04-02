import type { Migration } from '../common';
import { createdDocumentId } from './5.0.0-02-document-id';
import { renameIdentifiersLongerThanMaxLength } from './5.0.0-01-convert-identifiers-long-than-max-length';
import { discardDocumentDrafts } from './5.0.0-03-document-discard-drafts';
// import { createDocumentDrafts } from './5.0.0-02-document-drafts';

/**
 * List of all the internal migrations. The array order will be the order in which they are executed.
 *
 * {
 *   name: 'some-name',
 *   async up(knex: Knex, db: Database) {},
 *   async down(knex: Knex, db: Database) {},
 * },
 */
export const internalMigrations: Migration[] = [
  renameIdentifiersLongerThanMaxLength,
  createdDocumentId,
  // createDocumentDrafts,
  discardDocumentDrafts,
];
 

