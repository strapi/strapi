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
        visible: true,
      },
      'content-type-builder': {
        visible: true,
      },
    },
    attributes: {
      uid: {
        type: 'string',
      },
      stages: {
        type: 'relation',
        target: 'admin::workflow-stage',
        relation: 'oneToMany',
        mappedBy: 'workflow',
      },
    },
  },
};
