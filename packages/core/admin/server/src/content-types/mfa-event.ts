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
  // Every query in `services/mfa*.ts` against this table narrows by user first, and
  // several run on the login path. Declared the way `upload`'s file content type
  // declares its own.
  indexes: [
    {
      // `isAccountThrottled` counts `challenge_failed` rows for one user inside a rolling window, and
      // `pruneEvents` runs after every insert. Both are per-user reads on every login.
      name: 'strapi_admin_mfa_events_user_id_index',
      columns: ['user_id'],
      type: null,
    },
    {
      // The throttle counts one `type` for one user, and `areCodesAcknowledged` reads the newest
      // `recovery_codes_issued` row for one user. Both narrow on the pair.
      name: 'strapi_admin_mfa_events_user_id_type_index',
      columns: ['user_id', 'type'],
      type: null,
    },
  ],
};
