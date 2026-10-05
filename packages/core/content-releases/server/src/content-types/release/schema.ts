import {
  DEFAULT_RELEASE_STRATEGY,
  RELEASE_ACTION_MODEL_UID,
  RELEASE_STRATEGIES,
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
      enum: ['ready', 'blocked', 'failed', 'done', 'empty'],
      required: true,
    },
    releaseStrategy: {
      type: 'enumeration',
      enum: [...RELEASE_STRATEGIES],
      default: DEFAULT_RELEASE_STRATEGY,
      required: true,
    },
    actions: {
      type: 'relation',
      relation: 'oneToMany',
      target: RELEASE_ACTION_MODEL_UID,
      mappedBy: 'release',
    },
  },
};
