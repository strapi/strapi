export default {
  collectionName: 'admin_sessions',
  info: {
    name: 'Session',
    description: 'Admin user session management',
    singularName: 'session',
    pluralName: 'sessions',
    displayName: 'Session',
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
    userId: {
      type: 'string',
      required: true,
      configurable: false,
      private: true,
    },
    sessionId: {
      type: 'string',
      unique: true,
      required: true,
      configurable: false,
      private: true,
    },
    childId: {
      type: 'string',
      configurable: false,
      private: true,
    },
    deviceId: {
      type: 'string',
      required: true,
      configurable: false,
      private: true,
    },
    origin: {
      type: 'string',
      required: true,
      configurable: false,
      private: true,
    },
    expiresAt: {
      type: 'datetime',
      required: true,
      configurable: false,
      private: true,
    },
    absoluteExpiresAt: {
      type: 'datetime',
      configurable: false,
      private: true,
    },
    status: {
      type: 'string',
      configurable: false,
      private: true,
    },
    type: {
      type: 'string',
      configurable: false,
      private: true,
    },
  },
};
