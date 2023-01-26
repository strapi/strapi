'use strict';

module.exports = {
  schema: {
    collectionName: 'strapi_workflows_stages',
    info: {
      name: 'Workflow Stage',
      description: '',
      singularName: 'workflow-stage',
      pluralName: 'workflow-stages',
      displayName: 'Stages',
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
      name: {
        type: 'string',
        configurable: false,
      },
      workflow: {
        type: 'relation',
        target: 'admin::workflow',
        relation: 'manyToOne',
        inversedBy: 'stages',
        configurable: false,
      },
    },
  },
};
