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
    pluginOptions: {},
    options: {},
    attributes: {
      uid: {
        type: 'string',
      },
    },
  },
};
