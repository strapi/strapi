import { RELEASE_MODEL_UID } from '../../constants';

export default {
  collectionName: 'strapi_release_actions',
  info: {
    singularName: 'release-action',
    pluralName: 'release-actions',
    displayName: 'Release Action',
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
    type: {
      type: 'enumeration',
      enum: ['publish', 'unpublish'],
      required: true,
    },
    contentType: {
      type: 'string',
      required: true,
    },
    entryDocumentId: {
      type: 'string',
    },
    locale: {
      type: 'string',
    },
    release: {
      type: 'relation',
      relation: 'manyToOne',
      target: RELEASE_MODEL_UID,
      inversedBy: 'actions',
    },
    isEntryValid: {
      type: 'boolean',
    },
    // What the run did with the entry. Null when no run recorded it.
    outcome: {
      type: 'enumeration',
      enum: [
        'published',
        'unpublished',
        'skipped_invalid',
        'skipped_not_approved',
        'skipped_error',
        'skipped_held',
      ],
    },
    reason: {
      type: 'json',
    },
  },
};
