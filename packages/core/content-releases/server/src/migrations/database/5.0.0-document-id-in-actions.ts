import type { Migration } from '@strapi/database';

/**
 * On v4, release actions are linked with entries using the built in Polymorphic relations.
 *
 * On v5, we are going to save entryDocumentId on the release action and make the link manually.
 * This because entryId is not a reliable way to link documents, as it can change.
 */
export const addEntryDocumentToReleaseActions: Migration = {
  name: 'content-releases::5.0.0-add-entry-document-id-to-release-actions',
  async up(trx, db) {
    const hasPolymorphicColumn = await trx.schema.hasColumn('strapi_release_actions', 'target_id');

    if (hasPolymorphicColumn) {
      const releaseActions = await trx.select('*').from('strapi_release_actions');

      for (const releaseAction of releaseActions) {
        const { target_type, target_id } = releaseAction;

        const entry = await db.query(target_type).findOne({ where: { id: target_id } });

        if (entry) {
          await trx('strapi_release_actions')
            .update({ entry_document_id: entry.documentId })
            .where('id', releaseAction.id);
        }
      }
    }
  },
  async down() {
    throw new Error('not implemented');
  },
};
