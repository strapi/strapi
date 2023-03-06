'use strict';

module.exports = {
  collectionName: 'strapi_transfer_token_permissions',
  info: {
    name: 'Transfer Token Permission',
    description: '',
    singularName: 'transfer-token-permission',
    pluralName: 'transfer-token-permissions',
    displayName: 'Transfer Token Permission',
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
      target: 'admin::transfer-token',
    },
  },
};
