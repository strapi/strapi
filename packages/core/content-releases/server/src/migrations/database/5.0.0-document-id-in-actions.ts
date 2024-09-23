import { async } from '@strapi/utils';

import type { Migration, Database } from '@strapi/database';

type Knex = Parameters<Migration['up']>[0];

/**
 * On v4, release actions are linked with entries using the built in Polymorphic relations.
 *
 * On v5, we are going to save entryDocumentId on the release action and make the link manually.
 * This because entryId is not a reliable way to link documents, as it can change.
 */
export const addEntryDocumentToReleaseActions: Migration = {
  name: 'content-releases::5.0.0-add-entry-document-id-to-release-actions',
  async up(trx: Knex, db: Database) {
    const hasPolymorphicColumn = await trx.schema.hasColumn('strapi_release_actions', 'target_id');

    // If user has PolymorphicColumn means that is coming from v4
    if (hasPolymorphicColumn) {
      // First time coming from v4 user doesn't have entryDocumentId
      // but we double check to avoid errors
      const hasEntryDocumentIdColumn = await trx.schema.hasColumn(
        'strapi_release_actions',
        'entry_document_id'
      );

      if (!hasEntryDocumentIdColumn) {
        await trx.schema.alterTable('strapi_release_actions', (table) => {
          table.string('entry_document_id');
        });
      }

      const releaseActions = await trx.select('*').from('strapi_release_actions');

      async.map(releaseActions, async (action: any) => {
        const { target_type, target_id } = action;

        const entry = await db.query(target_type).findOne({ where: { id: target_id } });

        if (entry) {
          await trx('strapi_release_actions')
            .update({ entry_document_id: entry.documentId })
            .where('id', action.id);
        }
      });
    }
  },
  async down() {
    throw new Error('not implemented');
  },
};
