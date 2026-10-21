import { RELEASE_ACTION_OUTCOMES, RELEASE_MODEL_UID } from '../../constants';

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
    // What happened to the entry when its release froze. Null while the release is planned.
    outcome: {
      type: 'enumeration',
      enum: [...RELEASE_ACTION_OUTCOMES],
    },
    reason: {
      type: 'json',
    },
  },
};
