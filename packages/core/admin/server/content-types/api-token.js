'use strict';

/**
 * Lifecycle callbacks for the `ApiToken` model.
 */
module.exports = {
  collectionName: 'strapi_api_token',
  info: {
    name: 'Api Token',
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
      type: 'string',
      minLength: 1,
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
