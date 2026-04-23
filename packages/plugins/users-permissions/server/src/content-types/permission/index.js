'use strict';

module.exports = {
  collectionName: 'up_permissions',
  info: {
    name: 'permission',
    description: '',
    singularName: 'permission',
    pluralName: 'permissions',
    displayName: 'Permission',
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
    action: {
      type: 'string',
      required: true,
      configurable: false,
    },
    role: {
      type: 'relation',
      relation: 'manyToOne',
      target: 'plugin::users-permissions.role',
      inversedBy: 'permissions',
      configurable: false,
    },
  },
};
