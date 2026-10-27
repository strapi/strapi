/**
 * One row per document, locked (`SELECT … FOR UPDATE`) at the start of every write, review
 * and declaration of that document so they run one after the other. Content rows cannot
 * serve as the lock: publishing deletes and recreates them while other transactions wait.
 */
export default {
  schema: {
    collectionName: 'provenance_document_locks',
    info: {
      singularName: 'document-lock',
      pluralName: 'document-locks',
      displayName: 'Provenance document lock',
    },
    options: {
      draftAndPublish: false,
    },
    pluginOptions: {
      'content-manager': {
        visible: false,
      },
      'content-type-builder': {
        visible: false,
      },
    },
    attributes: {
      targetUid: { type: 'string', required: true },
      targetDocumentId: { type: 'string', required: true },
    },
    indexes: [
      {
        name: 'provenance_document_locks_unique',
        type: 'unique',
        columns: ['target_uid', 'target_document_id'],
      },
    ],
  },
};
