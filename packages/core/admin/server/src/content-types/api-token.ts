import constants from '../services/constants';

export default {
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
      unique: true,
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
      enum: Object.values(constants.API_TOKEN_TYPE),
      configurable: false,
      required: true,
      default: constants.API_TOKEN_TYPE.READ_ONLY,
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
      target: 'admin::api-token-permission',
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
