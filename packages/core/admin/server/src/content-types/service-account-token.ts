export default {
  collectionName: 'strapi_service_account_tokens',
  info: {
    name: 'Service Account Token',
    singularName: 'service-account-token',
    pluralName: 'service-account-tokens',
    displayName: 'Service Account Token',
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
    roles: {
      configurable: false,
      type: 'relation',
      relation: 'manyToMany',
      inversedBy: 'serviceAccountTokens',
      target: 'admin::role',
      required: true,
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
