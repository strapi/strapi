export default {
  collectionName: 'strapi_admin_mfa_challenges',
  info: {
    name: 'MFA Challenge',
    description: 'Pending second-factor challenges. Grants no access on its own.',
    singularName: 'mfa-challenge',
    pluralName: 'mfa-challenges',
    displayName: 'MFA Challenge',
  },
  options: {
    draftAndPublish: false,
  },
  pluginOptions: {
    'content-manager': { visible: false },
    'content-type-builder': { visible: false },
    i18n: { localized: false },
  },
  attributes: {
    token: {
      type: 'string',
      unique: true,
      required: true,
      configurable: false,
      private: true,
      searchable: false,
    },
    userId: {
      type: 'string',
      required: true,
      configurable: false,
      private: true,
      searchable: false,
    },
    factorType: {
      type: 'string',
      required: true,
      configurable: false,
      private: true,
      searchable: false,
    },
    attempts: {
      type: 'integer',
      default: 0,
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
    consumedAt: {
      type: 'datetime',
      configurable: false,
      private: true,
      searchable: false,
    },
  },
};
