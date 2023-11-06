import { RELEASE_ACTION_MODEL_UID } from '../../constants';

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
    actions: {
      type: 'relation',
      relation: 'oneToMany',
      target: RELEASE_ACTION_MODEL_UID,
      mappedBy: 'release',
    },
  },
};
