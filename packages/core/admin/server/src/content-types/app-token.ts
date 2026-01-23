import constants from '../services/constants';

export default {
  collectionName: 'strapi_app_tokens',
  info: {
    name: 'App Token',
    singularName: 'app-token',
    pluralName: 'app-tokens',
    displayName: 'App Token',
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
      enum: Object.values(constants.APP_TOKEN_TYPE),
      configurable: false,
      required: true,
      default: constants.APP_TOKEN_TYPE.INHERIT,
    },
    accessKey: {
      type: 'string',
      minLength: 1,
      configurable: false,
      required: true,
      searchable: false,
    },
    encryptedKey: {
      type: 'text',
      minLength: 1,
      configurable: false,
      required: false,
      searchable: false,
    },
    lastUsedAt: {
      type: 'datetime',
      configurable: false,
      required: false,
    },
    permissions: {
      type: 'relation',
      target: 'admin::permission',
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
    user: {
      type: 'relation',
      target: 'admin::user',
      relation: 'manyToOne',
      inversedBy: 'appTokens',
      configurable: false,
      required: true,
    },
  },
};
