'use strict';

module.exports = {
  collectionName: 'strapi_token_permissions',
  info: {
    name: 'API Token Permission',
    description: '',
    singularName: 'token-permission',
    pluralName: 'token-permissions',
    displayName: 'API Token Permission',
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
    action: {
      type: 'string',
      minLength: 1,
      configurable: false,
      required: true,
    },
    token: {
      configurable: false,
      type: 'relation',
      relation: 'manyToOne',
      inversedBy: 'permissions',
      target: 'admin::api-token',
    },
  },
};
