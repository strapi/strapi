'use strict';

module.exports = {
  collectionName: 'strapi_transfer_tokens',
  info: {
    name: 'Transfer Token',
    singularName: 'transfer-token',
    pluralName: 'transfer-tokens',
    displayName: 'Transfer Token',
    description: '',
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
      minLength: 1,
      configurable: false,
      required: true,
      unique: true,
    },
    description: {
      type: 'string',
      minLength: 1,
      configurable: false,
      required: false,
      default: '',
    },
    accessKey: {
      type: 'string',
      minLength: 1,
      configurable: false,
      required: true,
    },
    lastUsedAt: {
      type: 'datetime',
      configurable: false,
      required: false,
    },
    permissions: {
      type: 'relation',
      target: 'admin::transfer-token-permission',
      relation: 'oneToMany',
      mappedBy: 'token',
      configurable: false,
      required: false,
    },
    expiresAt: {
      type: 'datetime',
      configurable: false,
      required: false,
    },
    lifespan: {
      type: 'biginteger',
      configurable: false,
      required: false,
    },
  },
};
