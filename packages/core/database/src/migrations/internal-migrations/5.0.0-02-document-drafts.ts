import type { Migration } from '../common';

/**
 * On V4 there was no concept of document, and an entry could be in a draft or published state.
 * But not both at the same time.
 *
 * On V5 we introduced the concept of document, and an entry can be in a draft or published state,
 * with the requirement that a document must always have a draft.
 *
 * This migration creates the document draft counterpart for all the entries that were in a published state.
 *
 */
export const createDocumentDrafts: Migration = {
  name: 'created-document-id',
  async up(knex, db) {
    //
  },
  async down() {
    throw new Error('not implemented');
  },
};
