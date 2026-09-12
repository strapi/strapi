export default {
  collectionName: 'strapi_admin_mfa_recovery_codes',
  info: {
    name: 'MFA Recovery Code',
    description: 'Single-use recovery codes. One row per code so consumption is a row update.',
    singularName: 'mfa-recovery-code',
    pluralName: 'mfa-recovery-codes',
    displayName: 'MFA Recovery Code',
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
    codeHash: {
      type: 'string',
      required: true,
      configurable: false,
      private: true,
      searchable: false,
    },
    usedAt: {
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
      // `consumeRecoveryCode` loads a user's unused codes on every recovery attempt, and
      // `issueRecoveryCodes` deletes the whole set by user.
      name: 'strapi_admin_mfa_recovery_codes_user_id_index',
      columns: ['user_id'],
      type: null,
    },
  ],
};
