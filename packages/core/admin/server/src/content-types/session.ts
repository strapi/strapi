export default {
  collectionName: 'strapi_sessions',
  info: {
    name: 'Session',
    description: 'Session Manager storage',
    singularName: 'session',
    pluralName: 'sessions',
    displayName: 'Session',
  },
  options: {
    draftAndPublish: false,
  },
  pluginOptions: {
    'content-manager': {
      visible: false,
    },
    'content-type-builder': {
      visible: false,
    },
    i18n: {
      localized: false,
    },
  },
  attributes: {
    userId: {
      type: 'string',
      required: true,
      configurable: false,
      private: true,
      searchable: false,
    },
    sessionId: {
      type: 'string',
      unique: true,
      required: true,
      configurable: false,
      private: true,
      searchable: false,
    },
    childId: {
      type: 'string',
      configurable: false,
      private: true,
      searchable: false,
    },
    deviceId: {
      type: 'string',
      required: true,
      configurable: false,
      private: true,
      searchable: false,
    },
    origin: {
      type: 'string',
      required: true,
      configurable: false,
      private: true,
      searchable: false,
    },
    expiresAt: {
      type: 'datetime',
      required: true,
      configurable: false,
      private: true,
      searchable: false,
    },
    absoluteExpiresAt: {
      type: 'datetime',
      configurable: false,
      private: true,
      searchable: false,
    },
    status: {
      type: 'string',
      configurable: false,
      private: true,
      searchable: false,
    },
    type: {
      type: 'string',
      configurable: false,
      private: true,
      searchable: false,
    },
  },
};
