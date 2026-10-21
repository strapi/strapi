import {
  DEFAULT_RELEASE_CONDITION,
  RELEASE_ACTION_MODEL_UID,
  RELEASE_CONDITIONS,
  RELEASE_FAILURE_REASONS,
  RELEASE_STATUSES,
} from '../../constants';

export default {
  collectionName: 'strapi_releases',
  info: {
    singularName: 'release',
    pluralName: 'releases',
    displayName: 'Release',
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
    name: {
      type: 'string',
      required: true,
    },
    releasedAt: {
      type: 'datetime',
    },
    scheduledAt: {
      type: 'datetime',
    },
    timezone: {
      type: 'string',
    },
    status: {
      type: 'enumeration',
      enum: [...RELEASE_STATUSES],
      required: true,
    },
    releaseCondition: {
      type: 'enumeration',
      enum: [...RELEASE_CONDITIONS],
      default: DEFAULT_RELEASE_CONDITION,
      required: true,
    },
    // What the run did with the release's entries, written when it runs. Null until then.
    totalPublishedEntries: {
      type: 'integer',
    },
    totalUnpublishedEntries: {
      type: 'integer',
    },
    // Every entry the run didn't release, whatever the reason
    totalSkippedEntries: {
      type: 'integer',
    },
    failureReason: {
      type: 'enumeration',
      enum: [...RELEASE_FAILURE_REASONS],
    },
    actions: {
      type: 'relation',
      relation: 'oneToMany',
      target: RELEASE_ACTION_MODEL_UID,
      mappedBy: 'release',
    },
  },
};
