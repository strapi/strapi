export default {
  collectionName: 'strapi_admin_mfa_events',
  info: {
    name: 'MFA Event',
    description:
      'Security notices surfaced in-app, and the source of the account-scoped attempt counter.',
    singularName: 'mfa-event',
    pluralName: 'mfa-events',
    displayName: 'MFA Event',
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
    userId: {
      type: 'string',
      required: true,
      configurable: false,
      private: true,
      searchable: false,
    },
    type: {
      type: 'string',
      required: true,
      configurable: false,
      private: true,
      searchable: false,
    },
    metadata: {
      type: 'json',
      configurable: false,
      private: true,
      searchable: false,
    },
    seenAt: {
      type: 'datetime',
      configurable: false,
      private: true,
      searchable: false,
    },
  },
};
