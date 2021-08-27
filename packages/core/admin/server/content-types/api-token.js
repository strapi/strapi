'use strict';

/**
 * Lifecycle callbacks for the `ApiToken` model.
 */
module.exports = {
  collectionName: 'strapi_api_tokens',
  info: {
    name: 'Api Token',
    singularName: 'api-token',
    pluralName: 'api-tokens',
    displayName: 'Api Token',
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
    },
    description: {
      type: 'string',
      minLength: 1,
      configurable: false,
      required: false,
      default: '',
    },
    type: {
      type: 'enumeration',
      enum: ['read-only', 'full-access'],
      configurable: false,
      required: false,
      default: 'read-only',
    },
    accessKey: {
      type: 'string',
      minLength: 1,
      configurable: false,
      required: true,
    },
  },
};
