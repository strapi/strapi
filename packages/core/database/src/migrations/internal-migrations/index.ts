import type { Migration } from '../common';
import { renameIdentifiersLongerThanMaxLength } from './5.0.0-convert-identifiers-long-than-max-length';

/**
 * List of all the internal migrations. The array order will be the order in which they are executed.
 *
 * {
 *   name: 'some-name',
 *   async up(knex: Knex, db: Database) {},
 *   async down(knex: Knex, db: Database) {},
 * },
 */
export const internalMigrations: Migration[] = [renameIdentifiersLongerThanMaxLength];
