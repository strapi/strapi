'use strict';

module.exports = {
  schema: {
    collectionName: 'strapi_workflows',
    info: {
      name: 'Workflow',
      description: '',
      singularName: 'workflow',
      pluralName: 'workflows',
      displayName: 'Workflow',
    },
    options: {},
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
        unique: true,
      },
      stages: {
        type: 'relation',
        target: 'admin::workflow-stage',
        relation: 'oneToMany',
        mappedBy: 'workflow',
      },
      contentTypes: {
        type: 'json',
        required: true,
        default: [],
      },
    },
  },
};
