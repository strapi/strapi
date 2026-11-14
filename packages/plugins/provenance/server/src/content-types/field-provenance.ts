import { SIGNALS, SOURCES } from '../constants';

/**
 * Current provenance of one field of one entry (document + locale + status).
 * Only the latest state is kept; history can later come from Content History.
 */
export default {
  schema: {
    collectionName: 'provenance_fields',
    info: {
      singularName: 'field-provenance',
      pluralName: 'field-provenances',
      displayName: 'Field provenance',
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
      targetLocale: { type: 'string' },
      targetStatus: { type: 'enumeration', enum: ['draft', 'published'], required: true },
      fieldPath: { type: 'string', required: true },
      source: { type: 'enumeration', enum: [...SOURCES], required: true },
      signal: { type: 'enumeration', enum: [...SIGNALS], required: true },
      actorType: { type: 'string', required: true },
      actorId: { type: 'string' },
      model: { type: 'string' },
      agent: { type: 'string' },
      valueHash: { type: 'string', required: true },
      reviewedById: { type: 'string' },
      reviewedAt: { type: 'datetime' },
      reviewedHash: { type: 'string' },
      recordedAt: { type: 'datetime', required: true },
    },
    // experimental feature, see upload's folder content type
    indexes: [
      // MySQL limits an index to 3072 bytes: three varchar(255) utf8mb4 columns at most.
      // The status is left out, it only tells apart two rows per field.
      {
        name: 'provenance_fields_target_index',
        columns: ['target_document_id', 'target_locale', 'target_uid'],
      },
      // The list filter and the summary look up AI rows of a content type (3 × 1020 bytes)
      {
        name: 'provenance_fields_source_index',
        columns: ['target_uid', 'target_status', 'source'],
      },
    ],
  },
};
