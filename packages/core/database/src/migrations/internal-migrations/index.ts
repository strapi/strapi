import type { Migration } from '../common';
import { createdDocumentId } from './document-id';

/**
 * List of all the internal migrations. The array order will be the order in which they are executed.
 *
 * {
 *   name: 'some-name',
 *   async up(knex: Knex, db: Database) {},
 *   async down(knex: Knex, db: Database) {},
 * },
 */
export const internalMigrations: Migration[] = [createdDocumentId];
